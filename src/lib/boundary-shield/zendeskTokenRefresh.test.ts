import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MemoryBoundaryDatabase } from "./boundaryDatabase";
import { openSecret, sealSecret } from "./zendeskOAuth";
import { ROUTING_WRITES_ENABLED } from "./emailRouting";
import {
  createRefreshingTransport,
  refreshSealedZendeskToken,
} from "./zendeskTokenRefresh";
import { handleBoundaryWebhook, WEBHOOK_WRITES_ENABLED } from "./webhookEndpoint";
import { signZendeskWebhook } from "./zendeskWebhookSignature";

const KEY = Buffer.alloc(32, 3);
const NOW = new Date("2026-11-11T18:00:00Z");
const SECRET = "staging-webhook-secret";
const INSULT = "You're an idiot.";

function installation(database: MemoryBoundaryDatabase, refresh = "refresh-token", access = "expired-access") {
  return database.saveInstallation({
    subdomain: "example",
    reviewGroupId: "701",
    normalGroupId: "702",
    sealedAccessToken: sealSecret(access, KEY),
    sealedRefreshToken: sealSecret(refresh, KEY),
    tokenExpiresAt: "2026-11-11T17:00:00Z",
  });
}

test("a 401 refreshes once, stores both rotated tokens, and retries the same GET", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const calls: string[] = [];
  let posts = 0;
  const transport = createRefreshingTransport({
    send: async (request) => {
      calls.push(`${request.token} ${request.url}`);
      if (request.token === "expired-access") return { status: 401, body: { error: "invalid_token" } };
      return { status: 200, body: { comments: [] } };
    },
    rotate: () => refreshSealedZendeskToken({
      subdomain: "example",
      expectedSealedRefreshToken: expected,
      database,
      tokenKey: KEY,
      clientId: "calmline-client",
      clientSecret: "client-secret",
      now: NOW,
      transport: async (request) => {
        posts += 1;
        const body = JSON.parse(request.body) as { grant_type: string; scope: string; refresh_token: string };
        assert.equal(request.url, "https://example.zendesk.com/oauth/tokens");
        assert.equal(body.grant_type, "refresh_token");
        assert.equal(body.scope, "read");
        assert.equal(body.refresh_token, "refresh-token");
        return {
          status: 200,
          body: { access_token: "fresh-access", refresh_token: "fresh-refresh", scope: "read", expires_in: 1800 },
        };
      },
    }),
  });
  const response = await transport({
    method: "GET",
    url: "https://example.zendesk.com/api/v2/tickets/4/comments.json",
    token: "expired-access",
  });
  assert.equal(response.status, 200);
  assert.equal(posts, 1);
  assert.deepEqual(calls, [
    "expired-access https://example.zendesk.com/api/v2/tickets/4/comments.json",
    "fresh-access https://example.zendesk.com/api/v2/tickets/4/comments.json",
  ]);
  const saved = await database.getInstallation("example");
  assert.equal(openSecret(saved?.sealedAccessToken ?? "", KEY), "fresh-access");
  assert.equal(openSecret(saved?.sealedRefreshToken ?? "", KEY), "fresh-refresh");
  assert.equal(saved?.tokenExpiresAt, "2026-11-11T18:30:00.000Z");
  assert.equal(JSON.stringify(saved).includes("fresh-access"), false);
});

test("a rejected refresh, a storage failure, or a second 401 does not retry again", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  let posts = 0;
  const rejected = await refreshSealedZendeskToken({
    subdomain: "example",
    expectedSealedRefreshToken: expected,
    database,
    tokenKey: KEY,
    clientId: "calmline-client",
    clientSecret: "client-secret",
    transport: async () => {
      posts += 1;
      return { status: 401, body: { error: "invalid_token", error_description: "revoked" } };
    },
  });
  assert.equal(rejected, null);
  assert.equal(posts, 1);
  assert.equal(openSecret((await database.getInstallation("example"))?.sealedAccessToken ?? "", KEY), "expired-access");

  database.rotateSealedOAuth = async () => {
    throw new Error("OAuth token storage failed");
  };
  const unsaved = await refreshSealedZendeskToken({
    subdomain: "example",
    expectedSealedRefreshToken: expected,
    database,
    tokenKey: KEY,
    clientId: "calmline-client",
    clientSecret: "client-secret",
    transport: async () => ({
      status: 200,
      body: { access_token: "should-not-store", refresh_token: "should-not-store-refresh", scope: "read", expires_in: 1800 },
    }),
  });
  assert.equal(unsaved, null);
  assert.equal(openSecret((await database.getInstallation("example"))?.sealedAccessToken ?? "", KEY), "expired-access");

  const sends: string[] = [];
  let rotations = 0;
  const transport = createRefreshingTransport({
    send: async (request) => {
      sends.push(request.token);
      return { status: 401, body: null };
    },
    rotate: async () => {
      rotations += 1;
      return "fresh-access";
    },
  });
  await transport({ method: "GET", url: "https://example.zendesk.com/api/v2/tickets/4/comments.json", token: "expired-access" });
  await transport({ method: "GET", url: "https://example.zendesk.com/api/v2/users/55.json", token: "expired-access" });
  assert.equal(rotations, 1);
  assert.deepEqual(sends, ["expired-access", "fresh-access", "fresh-access"]);
});

test("a slower refresh cannot overwrite tokens stored by a newer refresh", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  let started = 0;
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const refresh = (access: string, nextRefresh: string) => refreshSealedZendeskToken({
    subdomain: "example",
    expectedSealedRefreshToken: expected,
    database,
    tokenKey: KEY,
    clientId: "calmline-client",
    clientSecret: "client-secret",
    now: NOW,
    transport: async () => {
      started += 1;
      if (started === 2) release();
      await gate;
      return {
        status: 200,
        body: { access_token: access, refresh_token: nextRefresh, scope: "read", expires_in: 1800 },
      };
    },
  });
  const [first, second] = await Promise.all([refresh("access-a", "refresh-a"), refresh("access-b", "refresh-b")]);
  const saved = await database.getInstallation("example");
  const storedAccess = openSecret(saved?.sealedAccessToken ?? "", KEY);
  const storedRefresh = openSecret(saved?.sealedRefreshToken ?? "", KEY);
  assert.equal(storedAccess === "access-a" || storedAccess === "access-b", true);
  assert.equal(storedRefresh, storedAccess === "access-a" ? "refresh-a" : "refresh-b");
  assert.equal(first, storedAccess);
  assert.equal(second, storedAccess);
});

test("rotation is conditional and the migration does not return tokens", () => {
  const sql = fs.readFileSync("supabase/migrations/010_boundary_shield_oauth_rotation.sql", "utf8");
  const previous = fs.readFileSync("supabase/migrations/009_boundary_shield_oauth_token.sql", "utf8");
  assert.match(sql, /sealed_refresh_token = expected_sealed_refresh_token/);
  assert.match(sql, /returns boolean/);
  assert.match(sql, /revoke all on function public\.boundary_shield_rotate_oauth\(text, text, text, text, timestamptz\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.boundary_shield_rotate_oauth\(text, text, text, text, timestamptz\) to service_role/);
  assert.equal(/grant execute[\s\S]*to (anon|authenticated|public)/i.test(sql), false);
  assert.equal(previous.includes("expected_sealed_refresh_token"), false);
});

test("the webhook retries one expired read and still does not write the ticket", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const body = JSON.stringify({
    account: { subdomain: "example" },
    ticket: { id: "4" },
    comment: { id: "100" },
  });
  const tokens: string[] = [];
  const response = await handleBoundaryWebhook(new Request("http://localhost/api/zendesk/boundary-shield/webhook", {
    method: "POST",
    headers: {
      "x-zendesk-webhook-signature": signZendeskWebhook(SECRET, NOW.toISOString(), body),
      "x-zendesk-webhook-signature-timestamp": NOW.toISOString(),
    },
    body,
  }), {
    secret: SECRET,
    now: NOW,
    database,
    tokenKey: KEY,
    zendeskGet: async (request) => {
      tokens.push(request.token);
      if (request.token === "expired-access") return { status: 401, body: { error: "invalid_token" } };
      if (request.url.endsWith("/comments.json")) {
        return {
          status: 200,
          body: {
            comments: [{
              id: 100,
              plain_body: INSULT,
              public: true,
              author_id: 55,
              created_at: NOW.toISOString(),
              via: { channel: "email" },
            }],
          },
        };
      }
      return { status: 200, body: { user: { role: "end-user" } } };
    },
    rotateToken: async () => "fresh-access",
  });
  const payload = await response.json() as { state: string; released: boolean; executed: boolean; zendeskWrite: string };
  assert.equal(response.status, 200);
  assert.equal(payload.state, "protected");
  assert.equal(payload.released, false);
  assert.equal(payload.executed, false);
  assert.equal(payload.zendeskWrite, "disabled");
  assert.equal(WEBHOOK_WRITES_ENABLED, false);
  assert.equal(ROUTING_WRITES_ENABLED, false);
  assert.deepEqual(tokens.slice(0, 2), ["expired-access", "fresh-access"]);
  assert.equal(JSON.stringify(payload).includes(INSULT), false);
});
