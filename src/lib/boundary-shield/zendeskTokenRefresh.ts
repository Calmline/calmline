import type { BoundaryDatabase } from "./boundaryDatabase";
import {
  assertSubdomain,
  openSecret,
  sealSecret,
  type OauthTransport,
} from "./zendeskOAuth";
import type { ZendeskReadTransport } from "./zendeskRead";

const REFRESH_STAGE = "refresh-status";

const REFRESH_REASONS = [
  "refresh-open",
  "refresh-request",
  "refresh-validation",
  "refresh-seal",
  "refresh-storage",
] as const;

type RefreshReason = (typeof REFRESH_REASONS)[number];

const REFRESH_ERROR_CODES = [
  "invalid_request",
  "invalid_grant",
  "invalid_scope",
  "invalid_client",
  "unauthorized_client",
  "unsupported_grant_type",
] as const;

type RefreshErrorCode = (typeof REFRESH_ERROR_CODES)[number];

/** Reads only the OAuth error code. Descriptions and every other field are ignored. */
export function zendeskRefreshErrorCode(body: unknown): RefreshErrorCode | "unknown" {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "unknown";
  const error = (body as { error?: unknown }).error;
  return typeof error === "string" && (REFRESH_ERROR_CODES as readonly string[]).includes(error)
    ? error as RefreshErrorCode
    : "unknown";
}

/** A token-endpoint failure that carries no token, request body, or response body. */
class ZendeskRefreshFailure extends Error {
  readonly status: number | null;
  readonly error: string | null;
  readonly reason: RefreshReason;

  constructor(status: number | null, error: string | null, reason: RefreshReason) {
    super("Zendesk token refresh failed");
    this.name = "ZendeskRefreshFailure";
    this.status = Number.isInteger(status) ? status : null;
    this.error = error;
    this.reason = reason;
  }
}

export function zendeskRefreshFailureLog(status: number | null, error: string | null = null, reason: string | null = null): string {
  const record: { source: string; stage: string; status: number | null; error?: string; reason?: string } = {
    source: "boundary-shield",
    stage: REFRESH_STAGE,
    status: Number.isInteger(status) ? status : null,
  };
  if (typeof error === "string") {
    record.error = (REFRESH_ERROR_CODES as readonly string[]).includes(error) ? error : "unknown";
  }
  if (typeof reason === "string" && (REFRESH_REASONS as readonly string[]).includes(reason)) {
    record.reason = reason;
  }
  return JSON.stringify(record);
}

export async function refreshZendeskAccessToken(input: {
  subdomain: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  transport: OauthTransport;
  now?: Date;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: string | null; scope: string | null }> {
  const subdomain = assertSubdomain(input.subdomain);
  if (!input.refreshToken.trim() || !input.clientId.trim() || !input.clientSecret) {
    throw new ZendeskRefreshFailure(null, null, "refresh-request");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const response = await input.transport({
    url: `https://${subdomain}.zendesk.com/oauth/tokens`,
    method: "POST",
    body: body.toString(),
  });
  if (response.status !== 200 || !response.body || typeof response.body !== "object") {
    throw new ZendeskRefreshFailure(
      response.status,
      response.status !== 200 ? zendeskRefreshErrorCode(response.body) : null,
      "refresh-validation",
    );
  }
  const record = response.body as { access_token?: unknown; refresh_token?: unknown; scope?: unknown; expires_in?: unknown };
  if (typeof record.access_token !== "string" || !record.access_token || typeof record.refresh_token !== "string" || !record.refresh_token) {
    throw new ZendeskRefreshFailure(response.status, null, "refresh-validation");
  }
  const expiresIn = typeof record.expires_in === "number" ? record.expires_in : null;
  const now = input.now ?? new Date();
  return {
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: expiresIn === null ? null : new Date(now.getTime() + expiresIn * 1000).toISOString(),
    scope: typeof record.scope === "string" ? record.scope : null,
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
  seal?: (plain: string, key: Buffer) => string;
}): Promise<string | null> {
  let refreshToken = "";
  let reason: RefreshReason = "refresh-open";
  try {
    refreshToken = openSecret(input.expectedSealedRefreshToken, input.tokenKey);
    reason = "refresh-request";
    const refreshed = await refreshZendeskAccessToken({
      subdomain: input.subdomain,
      refreshToken,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
      transport: input.transport,
      now: input.now,
    });
    reason = "refresh-seal";
    const seal = input.seal ?? sealSecret;
    const sealedAccessToken = seal(refreshed.accessToken, input.tokenKey);
    const sealedRefreshToken = seal(refreshed.refreshToken, input.tokenKey);
    reason = "refresh-storage";
    const saved = await input.database.rotateSealedOAuth({
      subdomain: input.subdomain,
      expectedSealedRefreshToken: input.expectedSealedRefreshToken,
      sealedAccessToken,
      sealedRefreshToken,
      tokenExpiresAt: refreshed.expiresAt,
    });
    if (!saved) {
      const current = await input.database.getInstallation(input.subdomain);
      if (!current?.sealedAccessToken) return null;
      return openSecret(current.sealedAccessToken, input.tokenKey);
    }
    if (refreshed.scope !== null && refreshed.scope !== "read") {
      console.error(zendeskRefreshFailureLog(200, null, "refresh-validation"));
      return null;
    }
    return refreshed.accessToken;
  } catch (error) {
    if (error instanceof ZendeskRefreshFailure && error.error === "invalid_grant") {
      try {
        const current = await input.database.getInstallation(input.subdomain);
        if (current?.sealedAccessToken && current.sealedRefreshToken && current.sealedRefreshToken !== input.expectedSealedRefreshToken) {
          return openSecret(current.sealedAccessToken, input.tokenKey);
        }
      } catch {
        // The original invalid_grant is logged below when no newer token is available.
      }
    }
    const failure = error instanceof ZendeskRefreshFailure ? error : null;
    const loggedReason = failure?.reason ?? reason;
    const status = failure ? failure.status : loggedReason === "refresh-seal" || loggedReason === "refresh-storage" ? 200 : null;
    console.error(zendeskRefreshFailureLog(status, failure?.error ?? null, loggedReason));
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
