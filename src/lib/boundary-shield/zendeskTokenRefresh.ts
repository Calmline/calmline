import type { BoundaryDatabase } from "./boundaryDatabase";
import {
  assertSubdomain,
  openSecret,
  sealSecret,
  type OauthTransport,
} from "./zendeskOAuth";
import type { ZendeskReadTransport } from "./zendeskRead";

const REFRESH_STAGE = "refresh-status";

/** A token-endpoint failure that carries no token, request body, or response body. */
class ZendeskRefreshFailure extends Error {
  readonly status: number | null;

  constructor(status: number | null) {
    super("Zendesk token refresh failed");
    this.name = "ZendeskRefreshFailure";
    this.status = Number.isInteger(status) ? status : null;
  }
}

export function zendeskRefreshFailureLog(status: number | null): string {
  return JSON.stringify({
    source: "boundary-shield",
    stage: REFRESH_STAGE,
    status: Number.isInteger(status) ? status : null,
  });
}

export async function refreshZendeskAccessToken(input: {
  subdomain: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  transport: OauthTransport;
  now?: Date;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: string | null }> {
  const subdomain = assertSubdomain(input.subdomain);
  if (!input.refreshToken.trim() || !input.clientId.trim() || !input.clientSecret) {
    throw new ZendeskRefreshFailure(null);
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    scope: "read",
  });
  const response = await input.transport({
    url: `https://${subdomain}.zendesk.com/oauth/tokens`,
    method: "POST",
    body: body.toString(),
  });
  if (response.status !== 200 || !response.body || typeof response.body !== "object") {
    throw new ZendeskRefreshFailure(response.status);
  }
  const record = response.body as { access_token?: unknown; refresh_token?: unknown; scope?: unknown; expires_in?: unknown };
  const scope = typeof record.scope === "string" ? record.scope : "read";
  if (scope !== "read" || typeof record.access_token !== "string" || !record.access_token || typeof record.refresh_token !== "string" || !record.refresh_token) {
    throw new ZendeskRefreshFailure(response.status);
  }
  const expiresIn = typeof record.expires_in === "number" ? record.expires_in : null;
  const now = input.now ?? new Date();
  return {
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: expiresIn === null ? null : new Date(now.getTime() + expiresIn * 1000).toISOString(),
  };
}

/**
 * Exchanges the sealed refresh token and stores both new tokens only when the
 * stored refresh token is still the one this caller used.
 * Returns an access token to retry with, or null when the caller must stop.
 */
export async function refreshSealedZendeskToken(input: {
  subdomain: string;
  expectedSealedRefreshToken: string;
  database: BoundaryDatabase;
  tokenKey: Buffer;
  clientId: string;
  clientSecret: string;
  transport: OauthTransport;
  now?: Date;
}): Promise<string | null> {
  let refreshToken = "";
  try {
    refreshToken = openSecret(input.expectedSealedRefreshToken, input.tokenKey);
    const refreshed = await refreshZendeskAccessToken({
      subdomain: input.subdomain,
      refreshToken,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      transport: input.transport,
      now: input.now,
    });
    const saved = await input.database.rotateSealedOAuth({
      subdomain: input.subdomain,
      expectedSealedRefreshToken: input.expectedSealedRefreshToken,
      sealedAccessToken: sealSecret(refreshed.accessToken, input.tokenKey),
      sealedRefreshToken: sealSecret(refreshed.refreshToken, input.tokenKey),
      tokenExpiresAt: refreshed.expiresAt,
    });
    if (saved) return refreshed.accessToken;
    const current = await input.database.getInstallation(input.subdomain);
    if (!current?.sealedAccessToken) return null;
    return openSecret(current.sealedAccessToken, input.tokenKey);
  } catch (error) {
    console.error(zendeskRefreshFailureLog(error instanceof ZendeskRefreshFailure ? error.status : null));
    return null;
  } finally {
    refreshToken = "";
  }
}

/** Retries one unauthorized GET after a single refresh. Later 401 responses are not refreshed again. */
export function createRefreshingTransport(input: {
  send: ZendeskReadTransport;
  rotate: () => Promise<string | null>;
}): ZendeskReadTransport {
  let replacement: string | null = null;
  let refreshSpent = false;
  return async (request) => {
    const token = replacement ?? request.token;
    const response = await input.send({ method: "GET", url: request.url, token });
    if (response.status !== 401 || refreshSpent) return response;
    refreshSpent = true;
    const next = await input.rotate();
    if (!next) return response;
    replacement = next;
    return input.send({ method: "GET", url: request.url, token: next });
  };
}
