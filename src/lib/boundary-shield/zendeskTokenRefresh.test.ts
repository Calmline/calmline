import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MemoryBoundaryDatabase } from "./boundaryDatabase";
import { openOauthCredential, sealOauthCredential } from "./zendeskOAuth";
import { ROUTING_WRITES_ENABLED } from "./emailRouting";
import { ZendeskReadFailure, zendeskReadFailureLog } from "./zendeskRead";
import {
  createRefreshingTransport,
  refreshSealedZendeskToken,
  zendeskRefreshErrorCode,
  zendeskRefreshFailureLog,
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
    sealedAccessToken: sealOauthCredential(access, "read", KEY),
    sealedRefreshToken: sealOauthCredential(refresh, "read", KEY),
    tokenExpiresAt: "2026-11-11T17:00:00Z",
  });
}

function token(sealed: string | null | undefined): string {
  return openOauthCredential(sealed || "", KEY).secret;
}

function granted(sealed: string | null | undefined): string | null {
  return openOauthCredential(sealed || "", KEY).scope;
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
        const body = new URLSearchParams(request.body);
        assert.equal(request.url, "https://example.zendesk.com/oauth/tokens");
        assert.equal(body.get("grant_type"), "refresh_token");
        assert.equal(body.get("scope"), null);
        assert.equal(body.get("client_id"), "calmline-client");
        assert.equal(body.get("client_secret"), "client-secret");
        assert.equal(body.get("refresh_token"), "refresh-token");
        assert.equal(request.body.startsWith("{"), false);
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
  assert.equal(token(saved?.sealedAccessToken ?? ""), "fresh-access");
  assert.equal(token(saved?.sealedRefreshToken ?? ""), "fresh-refresh");
  assert.equal(saved?.tokenExpiresAt, "2026-11-11T18:30:00.000Z");
  assert.equal(JSON.stringify(saved).includes("fresh-access"), false);
});

test("an HTTP 201 refresh is saved and a malformed token response is not", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const calls: string[] = [];
  const response = await createRefreshingTransport({
    send: async (request) => {
      calls.push(request.token);
      return request.token === "created-access" ? { status: 200, body: { comments: [] } } : { status: 401, body: {} };
    },
    rotate: () => refreshSealedZendeskToken({
      subdomain: "example",
      expectedSealedRefreshToken: expected,
      database,
      tokenKey: KEY,
      clientId: "calmline-client",
      clientSecret: "client-secret",
      now: NOW,
      transport: async () => ({
        status: 201,
        body: { access_token: "created-access", refresh_token: "created-refresh", scope: "read", expires_in: 1800 },
      }),
    }),
  })({ method: "GET", url: "https://example.zendesk.com/api/v2/tickets/4/comments.json", token: "expired-access" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["expired-access", "created-access"]);
  const saved = await database.getInstallation("example");
  assert.equal(token(saved?.sealedAccessToken ?? ""), "created-access");
  assert.equal(token(saved?.sealedRefreshToken ?? ""), "created-refresh");
  assert.equal(granted(saved?.sealedAccessToken ?? ""), "read");
  assert.equal(saved?.tokenExpiresAt, "2026-11-11T18:30:00.000Z");
  assert.equal(JSON.stringify(saved).includes("created-access"), false);

  const unchanged = new MemoryBoundaryDatabase();
  await installation(unchanged);
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    const malformed = await refreshSealedZendeskToken({
      subdomain: "example",
      expectedSealedRefreshToken: (await unchanged.getInstallation("example"))?.sealedRefreshToken ?? "",
      database: unchanged,
      tokenKey: KEY,
      clientId: "calmline-client",
      clientSecret: "client-secret",
      transport: async () => ({ status: 201, body: { access_token: "created-access" } }),
    });
    assert.equal(malformed, null);
    assert.deepEqual(lines, [[zendeskRefreshFailureLog(201, null, "refresh-validation")]]);
    assert.equal(JSON.stringify(lines).includes("created-access"), false);
    assert.equal(token((await unchanged.getInstallation("example"))?.sealedAccessToken ?? ""), "expired-access");
    assert.equal(WEBHOOK_WRITES_ENABLED, false);
    assert.equal(ROUTING_WRITES_ENABLED, false);
  } finally {
    console.error = original;
  }
});

test("a rejected refresh, a storage failure, or a second 401 does not retry again", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  let posts = 0;
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  let rejected: string | null = null;
  try {
    rejected = await refreshSealedZendeskToken({
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
  } finally {
    console.error = original;
  }
  assert.equal(rejected, null);
  assert.equal(posts, 1);
  assert.deepEqual(lines, [[zendeskRefreshFailureLog(401, "unknown", "refresh-validation")]]);
  assert.equal(JSON.stringify(lines).includes("invalid_token"), false);
  assert.equal(JSON.stringify(lines).includes("revoked"), false);
  assert.equal(JSON.stringify(lines).includes("refresh-token"), false);
  assert.equal(JSON.stringify(lines).includes("client-secret"), false);
  assert.equal(token((await database.getInstallation("example"))?.sealedAccessToken ?? ""), "expired-access");

  database.rotateSealedOAuth = async () => {
    throw new Error("OAuth token storage failed");
  };
  const storageLines: unknown[][] = [];
  const storageLog = console.error;
  console.error = (...args: unknown[]) => {
    storageLines.push(args);
  };
  let unsaved: string | null = null;
  try {
    unsaved = await refreshSealedZendeskToken({
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
  } finally {
    console.error = storageLog;
  }
  assert.equal(unsaved, null);
  assert.deepEqual(storageLines, [[zendeskRefreshFailureLog(200, null, "refresh-storage")]]);
  assert.equal(JSON.stringify(storageLines).includes("should-not-store"), false);
  assert.equal(JSON.stringify(storageLines).includes("OAuth token storage failed"), false);
  assert.equal(token((await database.getInstallation("example"))?.sealedAccessToken ?? ""), "expired-access");

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
  const storedAccess = token(saved?.sealedAccessToken ?? "");
  const storedRefresh = token(saved?.sealedRefreshToken ?? "");
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

test("a rejected refresh logs only its status and does not release the ticket", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const body = JSON.stringify({
    account: { subdomain: "example" },
    ticket: { id: "4" },
    comment: { id: "100" },
  });
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  const gets: string[] = [];
  try {
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
        gets.push(request.token);
        return { status: 401, body: { error: "invalid_token" } };
      },
      rotateToken: (input) => refreshSealedZendeskToken({
        ...input,
        database,
        tokenKey: KEY,
        clientId: "calmline-client",
        clientSecret: "client-secret",
        transport: async (request) => {
          const form = new URLSearchParams(request.body);
          assert.equal(form.get("grant_type"), "refresh_token");
          assert.equal(form.get("scope"), null);
          return { status: 400, body: { error: "invalid_grant", error_description: "revoked", refresh_token: "refresh-token" } };
        },
      }),
    });
    const payload = await response.json() as { accepted: boolean; released: boolean; executed: boolean; zendeskWrite: string };
    assert.equal(response.status, 503);
    assert.equal(payload.accepted, false);
    assert.equal(payload.released, false);
    assert.equal(payload.executed, false);
    assert.equal(payload.zendeskWrite, "disabled");
    assert.deepEqual(gets, ["expired-access"]);
    assert.deepEqual(lines, [
      [zendeskRefreshFailureLog(400, "invalid_grant", "refresh-validation")],
      [zendeskReadFailureLog(new ZendeskReadFailure("comments-status", 401))],
    ]);
    assert.equal(JSON.stringify(lines).includes("refresh-token"), false);
    assert.equal(JSON.stringify(lines).includes("revoked"), false);
    assert.equal(JSON.stringify(payload).includes("refresh-status"), false);
    assert.equal((await database.listTicket("example", "4")).length, 0);
    assert.equal(token((await database.getInstallation("example"))?.sealedAccessToken ?? ""), "expired-access");
  } finally {
    console.error = original;
  }
});

test("one failed retry returns 503 and does not refresh again", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const body = JSON.stringify({
    account: { subdomain: "example" },
    ticket: { id: "4" },
    comment: { id: "100" },
  });
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  const gets: string[] = [];
  let rotations = 0;
  try {
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
        gets.push(request.token);
        return { status: 401, body: { error: "invalid_token" } };
      },
      rotateToken: async () => {
        rotations += 1;
        return "fresh-access";
      },
    });
    const payload = await response.json() as { accepted: boolean; released: boolean; executed: boolean; zendeskWrite: string };
    assert.equal(response.status, 503);
    assert.equal(payload.accepted, false);
    assert.equal(payload.released, false);
    assert.equal(payload.executed, false);
    assert.equal(payload.zendeskWrite, "disabled");
    assert.equal(WEBHOOK_WRITES_ENABLED, false);
    assert.equal(ROUTING_WRITES_ENABLED, false);
    assert.equal(rotations, 1);
    assert.deepEqual(gets, ["expired-access", "fresh-access"]);
    assert.deepEqual(lines, [[zendeskReadFailureLog(new ZendeskReadFailure("comments-status", 401))]]);
    assert.equal(JSON.stringify(lines).includes("fresh-access"), false);
    assert.equal(JSON.stringify(payload).includes(INSULT), false);
    assert.equal((await database.listTicket("example", "4")).length, 0);
  } finally {
    console.error = original;
  }
});

test("the refresh request uses form encoding", () => {
  const route = fs.readFileSync("src/app/api/zendesk/boundary-shield/webhook/route.ts", "utf8");
  const refresh = fs.readFileSync("src/lib/boundary-shield/zendeskTokenRefresh.ts", "utf8");
  assert.match(route, /"content-type": "application\/x-www-form-urlencoded"/);
  assert.equal(route.includes('"content-type": "application/json"'), false);
  assert.match(refresh, /new URLSearchParams\(\{[^}]*grant_type: "refresh_token"/);
  assert.equal(/new URLSearchParams\(\{[^}]*\bscope\b/.test(refresh), false);
});

test("a non-200 refresh logs only an allowlisted error code", async () => {
  const codes = [
    "invalid_request",
    "invalid_grant",
    "invalid_scope",
    "invalid_client",
    "unauthorized_client",
    "unsupported_grant_type",
  ];
  for (const code of codes) {
    assert.equal(zendeskRefreshErrorCode({ error: code, error_description: "secret-detail", refresh_token: "secret-token" }), code);
    assert.equal(zendeskRefreshFailureLog(400, code).includes("secret-detail"), false);
  }
  assert.equal(zendeskRefreshErrorCode(null), "unknown");
  assert.equal(zendeskRefreshErrorCode("invalid_grant"), "unknown");
  assert.equal(zendeskRefreshErrorCode({ error: "invalid_token", error_description: "revoked" }), "unknown");
  assert.equal(zendeskRefreshErrorCode({ error: ["invalid_grant"] }), "unknown");
  assert.equal(zendeskRefreshErrorCode({ error_description: "revoked" }), "unknown");
  assert.equal(zendeskRefreshFailureLog(400, "not-a-code"), zendeskRefreshFailureLog(400, "unknown"));
  assert.equal(zendeskRefreshFailureLog(null).includes("error"), false);

  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    const rejected = await refreshSealedZendeskToken({
      subdomain: "example",
      expectedSealedRefreshToken: expected,
      database,
      tokenKey: KEY,
      clientId: "calmline-client",
      clientSecret: "client-secret",
      transport: async (request) => {
        const form = new URLSearchParams(request.body);
        assert.equal(form.get("scope"), null);
        assert.equal(form.get("grant_type"), "refresh_token");
        return { status: 400, body: { error: "invalid_scope", error_description: "do-not-log", access_token: "do-not-log-token" } };
      },
    });
    assert.equal(rejected, null);
    assert.deepEqual(lines, [[zendeskRefreshFailureLog(400, "invalid_scope", "refresh-validation")]]);
    assert.equal(JSON.stringify(lines).includes("do-not-log"), false);
    assert.equal(token((await database.getInstallation("example"))?.sealedRefreshToken ?? ""), "refresh-token");
  } finally {
    console.error = original;
  }
});

test("each refresh failure records only its allowlisted stage", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  const base = {
    subdomain: "example",
    expectedSealedRefreshToken: expected,
    database,
    tokenKey: KEY,
    clientId: "calmline-client",
    clientSecret: "client-secret",
  };
  try {
    assert.equal(await refreshSealedZendeskToken({
      ...base,
      expectedSealedRefreshToken: "not-a-sealed-token",
      transport: async () => {
        throw new Error("request must not be sent");
      },
    }), null);
    assert.equal(await refreshSealedZendeskToken({
      ...base,
      transport: async () => {
        throw new Error("connect failed secret-token");
      },
    }), null);
    assert.equal(await refreshSealedZendeskToken({
      ...base,
      transport: async () => ({
        status: 200,
        body: { access_token: "accepted-access", scope: "read", expires_in: 1800 },
      }),
    }), null);
    assert.equal(await refreshSealedZendeskToken({
      ...base,
      transport: async () => ({
        status: 200,
        body: { access_token: "accepted-access", refresh_token: "accepted-refresh", scope: "read", expires_in: 1800 },
      }),
      seal: () => {
        throw new Error("encryption failed accepted-access");
      },
    }), null);
    database.rotateSealedOAuth = async () => {
      throw new Error("database refused sealed token");
    };
    assert.equal(await refreshSealedZendeskToken({
      ...base,
      transport: async () => ({
        status: 200,
        body: { access_token: "accepted-access", refresh_token: "accepted-refresh", scope: "read", expires_in: 1800 },
      }),
    }), null);
    assert.deepEqual(lines, [
      [zendeskRefreshFailureLog(null, null, "refresh-open")],
      [zendeskRefreshFailureLog(null, null, "refresh-request")],
      [zendeskRefreshFailureLog(200, null, "refresh-validation")],
      [zendeskRefreshFailureLog(200, null, "refresh-seal")],
      [zendeskRefreshFailureLog(200, null, "refresh-storage")],
    ]);
    const logged = JSON.stringify(lines);
    assert.equal(logged.includes("secret-token"), false);
    assert.equal(logged.includes("accepted-access"), false);
    assert.equal(logged.includes("accepted-refresh"), false);
    assert.equal(logged.includes("encryption failed"), false);
    assert.equal(logged.includes("database refused"), false);
    assert.equal(logged.includes("request must not be sent"), false);
    assert.equal(token((await database.getInstallation("example"))?.sealedAccessToken ?? ""), "expired-access");
    assert.equal(token((await database.getInstallation("example"))?.sealedRefreshToken ?? ""), "refresh-token");
  } finally {
    console.error = original;
  }
});

test("an omitted refresh scope is stored as Zendesk's default and is not used", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    const access = await refreshSealedZendeskToken({
      subdomain: "example",
      expectedSealedRefreshToken: expected,
      database,
      tokenKey: KEY,
      clientId: "calmline-client",
      clientSecret: "client-secret",
      now: NOW,
      transport: async (request) => {
        const body = new URLSearchParams(request.body);
        assert.equal(body.get("grant_type"), "refresh_token");
        assert.equal(body.get("scope"), null);
        return { status: 200, body: { access_token: "omitted-access", refresh_token: "omitted-refresh", expires_in: 1800 } };
      },
    });
    assert.equal(access, null);
    const saved = await database.getInstallation("example");
    assert.equal(token(saved?.sealedAccessToken ?? ""), "omitted-access");
    assert.equal(granted(saved?.sealedAccessToken ?? ""), "read write");
    assert.equal(JSON.stringify(saved).includes("omitted-access"), false);
    assert.deepEqual(lines, [[zendeskRefreshFailureLog(200, null, "refresh-validation")]]);
  } finally {
    console.error = original;
  }
});

test("a non-read refresh scope is saved and is not used to read the ticket", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  const gets: string[] = [];
  try {
    const response = await createRefreshingTransport({
      send: async (request) => {
        gets.push(request.token);
        return { status: 401, body: { error: "invalid_token" } };
      },
      rotate: () => refreshSealedZendeskToken({
        subdomain: "example",
        expectedSealedRefreshToken: expected,
        database,
        tokenKey: KEY,
        clientId: "calmline-client",
        clientSecret: "client-secret",
        now: NOW,
        transport: async () => ({
          status: 200,
          body: { access_token: "wider-access", refresh_token: "wider-refresh", scope: "read write", expires_in: 1800 },
        }),
      }),
    })({ method: "GET", url: "https://example.zendesk.com/api/v2/tickets/4/comments.json", token: "expired-access" });
    assert.equal(response.status, 401);
    assert.deepEqual(gets, ["expired-access"]);
    assert.deepEqual(lines, [[zendeskRefreshFailureLog(200, null, "refresh-validation")]]);
    assert.equal(JSON.stringify(lines).includes("wider-access"), false);
    assert.equal(JSON.stringify(lines).includes("read write"), false);
    const saved = await database.getInstallation("example");
    assert.equal(token(saved?.sealedAccessToken ?? ""), "wider-access");
    assert.equal(granted(saved?.sealedAccessToken ?? ""), "read write");
    assert.equal(token(saved?.sealedRefreshToken ?? ""), "wider-refresh");
    const body = JSON.stringify({ account: { subdomain: "example" }, ticket: { id: "4" }, comment: { id: "100" } });
    let used = false;
    const webhook = await handleBoundaryWebhook(new Request("http://localhost/api/zendesk/boundary-shield/webhook", {
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
      zendeskGet: async () => {
        used = true;
        return { status: 200, body: { comments: [] } };
      },
      rotateToken: async () => {
        used = true;
        return "wider-access";
      },
    });
    const payload = await webhook.json() as { accepted: boolean; released: boolean; executed: boolean; zendeskWrite: string };
    assert.equal(webhook.status, 503);
    assert.equal(used, false);
    assert.equal(payload.accepted, false);
    assert.equal(payload.released, false);
    assert.equal(payload.executed, false);
    assert.equal(payload.zendeskWrite, "disabled");
    assert.equal(WEBHOOK_WRITES_ENABLED, false);
    assert.equal(ROUTING_WRITES_ENABLED, false);
  } finally {
    console.error = original;
  }
});

test("invalid_grant reuses a newer saved token and stops when none exists", async () => {
  const database = new MemoryBoundaryDatabase();
  await installation(database);
  const expected = (await database.getInstallation("example"))?.sealedRefreshToken ?? "";
  const winner = await refreshSealedZendeskToken({
    subdomain: "example",
    expectedSealedRefreshToken: expected,
    database,
    tokenKey: KEY,
    clientId: "calmline-client",
    clientSecret: "client-secret",
    now: NOW,
    transport: async () => ({
      status: 200,
      body: { access_token: "winner-access", refresh_token: "winner-refresh", scope: "read", expires_in: 1800 },
    }),
  });
  assert.equal(winner, "winner-access");
  const lines: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    lines.push(args);
  };
  try {
    const reused = await refreshSealedZendeskToken({
      subdomain: "example",
      expectedSealedRefreshToken: expected,
      database,
      tokenKey: KEY,
      clientId: "calmline-client",
      clientSecret: "client-secret",
      transport: async () => ({ status: 400, body: { error: "invalid_grant", error_description: "already used", refresh_token: "refresh-token" } }),
    });
    assert.equal(reused, "winner-access");
    assert.deepEqual(lines, []);
    const unchanged = new MemoryBoundaryDatabase();
    await installation(unchanged);
    const stopped = await refreshSealedZendeskToken({
      subdomain: "example",
      expectedSealedRefreshToken: (await unchanged.getInstallation("example"))?.sealedRefreshToken ?? "",
      database: unchanged,
      tokenKey: KEY,
      clientId: "calmline-client",
      clientSecret: "client-secret",
      transport: async () => ({ status: 400, body: { error: "invalid_grant", error_description: "already used", refresh_token: "refresh-token" } }),
    });
    assert.equal(stopped, null);
    assert.deepEqual(lines, [[zendeskRefreshFailureLog(400, "invalid_grant", "refresh-validation")]]);
    assert.equal(JSON.stringify(lines).includes("already used"), false);
    assert.equal(JSON.stringify(lines).includes("refresh-token"), false);
    assert.equal(token((await unchanged.getInstallation("example"))?.sealedRefreshToken ?? ""), "refresh-token");
    assert.equal(token((await database.getInstallation("example"))?.sealedAccessToken ?? ""), "winner-access");
  } finally {
    console.error = original;
  }
});
