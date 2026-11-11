import type { BoundaryDatabase } from "./boundaryDatabase";
import {
  exchangeAuthorizationCode,
  sealSecret,
  type OauthTransport,
} from "./zendeskOAuth";
import { oauthStateMatches, parseOAuthStateValue } from "./zendeskOAuthState";

export async function completeOAuthExchange(input: {
  code: string;
  queryState: string;
  cookieValue: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenKey: Buffer;
  database: BoundaryDatabase;
  transport: OauthTransport;
}): Promise<"stored" | "rejected"> {
  const cookie = parseOAuthStateValue(input.cookieValue);
  if (!cookie || !input.code.trim() || !oauthStateMatches(cookie.state, input.queryState)) return "rejected";
  const token = await exchangeAuthorizationCode({
    subdomain: cookie.subdomain,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
    code: input.code,
    redirectUri: input.redirectUri,
    scope: "read",
    transport: input.transport,
  });
  if (!token || token.scope !== "read") return "rejected";
  await input.database.storeSealedOAuth({
    subdomain: cookie.subdomain,
    sealedAccessToken: sealSecret(token.accessToken, input.tokenKey),
    sealedRefreshToken: token.refreshToken ? sealSecret(token.refreshToken, input.tokenKey) : null,
    tokenExpiresAt: token.expiresAt,
  });
  return "stored";
}
