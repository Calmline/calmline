import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MemoryBoundaryDatabase } from "./boundaryDatabase";
import { exchangeAuthorizationCode, openOauthCredential, sealSecret, zendeskAuthorizeUrl } from "./zendeskOAuth";
import { completeOAuthExchange } from "./zendeskOAuthFlow";
import {
  createOAuthState,
  encodeOAuthStateCookie,
  oauthStateMatches,
  STAGING_OAUTH_REDIRECT_URI,
} from "./zendeskOAuthState";

const KEY = Buffer.alloc(32, 9);

test("the staging authorization URL requests only the read scope", () => {
  const state = createOAuthState();
  const url = new URL(zendeskAuthorizeUrl({
    subdomain: "example",
    clientId: "calmline-client",
    redirectUri: STAGING_OAUTH_REDIRECT_URI,
    state,
    scope: "read",
  }));
  assert.equal(url.searchParams.get("scope"), "read");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("redirect_uri"), STAGING_OAUTH_REDIRECT_URI);
  assert.equal(url.searchParams.get("state"), state);
  assert.equal(url.toString().includes("write"), false);
  assert.throws(() => zendeskAuthorizeUrl({
    subdomain: "example",
    clientId: "calmline-client",
    redirectUri: STAGING_OAUTH_REDIRECT_URI,
    state,
    scope: "read write",
  }));
});

test("the callback rejects a mismatched state and stores only sealed tokens", async () => {
  const database = new MemoryBoundaryDatabase();
  await database.saveInstallation({
    subdomain: "example",
    reviewGroupId: "701",
    normalGroupId: "702",
    sealedAccessToken: null,
  });
  const state = createOAuthState();
  const cookieValue = encodeOAuthStateCookie({ state, subdomain: "example" });
  let requestedScope = "";
  const stored = await completeOAuthExchange({
    code: "authorization-code",
    queryState: state,
    cookieValue,
    clientId: "calmline-client",
    clientSecret: "client-secret",
    redirectUri: STAGING_OAUTH_REDIRECT_URI,
    tokenKey: KEY,
    database,
    transport: async (request) => {
      requestedScope = new URLSearchParams(request.body).get("scope") ?? "";
      assert.equal(request.method, "POST");
      assert.equal(request.url, "https://example.zendesk.com/oauth/tokens");
      return {
        status: 200,
        body: { access_token: "raw-access-token", refresh_token: "raw-refresh-token", scope: "read", expires_in: 3600 },
      };
    },
  });
  assert.equal(stored, "stored");
  assert.equal(requestedScope, "read");
  const installation = await database.getInstallation("example");
  const sealed = installation?.sealedAccessToken ?? "";
  assert.equal(sealed.includes("raw-access-token"), false);
  assert.equal(sealed.includes("raw-refresh-token"), false);
  assert.equal(openOauthCredential(sealed, KEY).secret, "raw-access-token");
  assert.equal(openOauthCredential(sealed, KEY).scope, "read");
  assert.equal(openOauthCredential(installation?.sealedRefreshToken ?? "", KEY).secret, "raw-refresh-token");
  assert.equal(openOauthCredential(installation?.sealedRefreshToken ?? "", KEY).scope, "read");

  const mismatched = await completeOAuthExchange({
    code: "another-code",
    queryState: createOAuthState(),
    cookieValue,
    clientId: "calmline-client",
    clientSecret: "client-secret",
    redirectUri: STAGING_OAUTH_REDIRECT_URI,
    tokenKey: KEY,
    database,
    transport: async () => {
      throw new Error("token endpoint must not be called");
    },
  });
  assert.equal(mismatched, "rejected");
  assert.equal(oauthStateMatches(state, `${state} `), false);
  await assert.rejects(() => exchangeAuthorizationCode({
    subdomain: "example",
    clientId: "calmline-client",
    clientSecret: "client-secret",
    code: "code",
    redirectUri: STAGING_OAUTH_REDIRECT_URI,
    scope: "write",
    transport: async () => ({ status: 200, body: {} }),
  }));
});

test("the token storage function returns nothing and is service-role only", () => {
  const sql = fs.readFileSync("supabase/migrations/009_boundary_shield_oauth_token.sql", "utf8");
  assert.match(sql, /returns void/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function public\.boundary_shield_store_oauth\(text, text, text, timestamptz\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.boundary_shield_store_oauth\(text, text, text, timestamptz\) to service_role/);
  assert.equal(/grant execute[\s\S]*to (anon|authenticated|public)/i.test(sql), false);
  assert.equal(sql.includes("calmlinellc"), false);
  assert.equal(/\bdrop\s+(table|function)\b/i.test(sql), false);
  const route = fs.readFileSync("src/app/api/zendesk/boundary-shield/oauth/callback/route.ts", "utf8");
  const start = fs.readFileSync("src/app/api/zendesk/boundary-shield/oauth/start/route.ts", "utf8");
  const exchange = fs.readFileSync("src/lib/boundary-shield/zendeskOAuthFlow.ts", "utf8");
  assert.match(route, /completeOAuthExchange\(/);
  assert.equal(/scope\s*:/.test(route), false);
  assert.match(exchange, /scope:\s*"read"/);
  assert.match(exchange, /token\.scope !== "read"/);
  assert.equal(start.includes("scope: \"read\""), true);
  assert.equal(start.includes("httpOnly: true"), true);
  assert.equal(start.includes("secure: true"), true);
  assert.equal(`${start}\n${route}\n${exchange}`.includes("read write"), false);
  assert.equal(/\bscope:\s*"write"/.test(`${start}\n${route}\n${exchange}`), false);
  assert.equal(sealSecret("token", KEY).includes("token"), false);
});
