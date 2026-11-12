import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type TenantInstallation = {
  subdomain: string;
  reviewGroupId: string;
  normalGroupId: string;
  webhookSecret: string;
};

export type OauthToken = {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  expiresAt: string | null;
};

export type OauthTransport = (request: {
  url: string;
  method: "POST";
  body: string;
}) => Promise<{ status: number; body: unknown }>;

const SUBDOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function tokenKeyFromEncoded(value: string | undefined): Buffer | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return Buffer.from(trimmed, "hex");
  if (!/^[A-Za-z0-9+/_-]+=*$/.test(trimmed)) return null;
  const decoded = Buffer.from(trimmed, trimmed.includes("-") || trimmed.includes("_") ? "base64url" : "base64");
  return decoded.length === 32 ? decoded : null;
}

export function assertSubdomain(value: string): string {
  const subdomain = value.trim().toLowerCase();
  if (!SUBDOMAIN.test(subdomain)) throw new Error("Invalid Zendesk subdomain");
  return subdomain;
}

export function sealSecret(plain: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function openSecret(sealed: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  const raw = Buffer.from(sealed, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Zendesk's token response uses `read write` when the scope field is omitted. */
export const OMITTED_GRANT_SCOPE = "read write";

export type SealedOauthCredential = {
  secret: string;
  scope: string | null;
};

export function effectiveGrantedScope(scope: unknown): string {
  return typeof scope === "string" && scope.trim() ? scope : OMITTED_GRANT_SCOPE;
}

export function sealOauthCredential(secret: string, scope: string, key: Buffer): string {
  return sealSecret(JSON.stringify({ v: 1, secret, scope }), key);
}

export function openOauthCredential(sealed: string, key: Buffer): SealedOauthCredential {
  const plain = openSecret(sealed, key);
  if (plain.startsWith("{")) {
    try {
      const parsed = JSON.parse(plain) as { v?: unknown; secret?: unknown; scope?: unknown };
      if (parsed.v === 1 && typeof parsed.secret === "string" && parsed.secret && typeof parsed.scope === "string" && parsed.scope.trim()) {
        return { secret: parsed.secret, scope: parsed.scope };
      }
    } catch {
      // Older sealed values contain only the token.
    }
  }
  return { secret: plain, scope: null };
}

/** Marketplace authorize URL for one Zendesk subdomain. No group id is implied. */
export function zendeskAuthorizeUrl(input: {
  subdomain: string;
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const subdomain = assertSubdomain(input.subdomain);
  const scope = input.scope ?? "read";
  if (scope !== "read") throw new Error("Zendesk OAuth scope must be read");
  const url = new URL(`https://${subdomain}.zendesk.com/oauth/authorizations/new`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeAuthorizationCode(input: {
  subdomain: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  scope?: string;
  transport: OauthTransport;
}): Promise<OauthToken> {
  const subdomain = assertSubdomain(input.subdomain);
  const scope = input.scope ?? "read";
  if (scope !== "read") throw new Error("Zendesk OAuth scope must be read");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    scope,
  });
  const response = await input.transport({
    url: `https://${subdomain}.zendesk.com/oauth/tokens`,
    method: "POST",
    body: body.toString(),
  });
  if (response.status !== 200 || !response.body || typeof response.body !== "object") {
    throw new Error("OAuth token exchange failed");
  }
  const record = response.body as { access_token?: unknown; refresh_token?: unknown; scope?: unknown; expires_in?: unknown };
  if (typeof record.access_token !== "string" || !record.access_token) throw new Error("OAuth token exchange failed");
  const expiresIn = typeof record.expires_in === "number" ? record.expires_in : null;
  return {
    accessToken: record.access_token,
    refreshToken: typeof record.refresh_token === "string" ? record.refresh_token : null,
    scope: effectiveGrantedScope(record.scope),
    expiresAt: expiresIn === null ? null : new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}
