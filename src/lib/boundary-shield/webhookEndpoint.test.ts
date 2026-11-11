import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { MemoryBoundaryDatabase, createSupabaseBoundaryDatabase } from "./boundaryDatabase";
import type { RoutingDecision } from "./emailRouting";
import { handleBoundaryWebhook, WEBHOOK_WRITES_ENABLED } from "./webhookEndpoint";
import { signZendeskWebhook } from "./zendeskWebhookSignature";

const NOW = new Date("2026-11-10T18:30:00Z");
const SECRET = "staging-webhook-secret";
const INSULT = "You're an idiot.";

function decision(overrides: Partial<RoutingDecision> = {}): RoutingDecision {
  return {
    accountId: "example",
    ticketId: "4",
    commentId: "100",
    createdAt: "2026-11-10T18:00:00Z",
    state: "pending",
    effect: "hold-pending",
    severity: "unclassified",
    reason: "classification-failed",
    blocksRelease: true,
    executed: false,
    update: {
      executed: false,
      ticketId: "4",
      groupId: "701",
      assigneeId: null,
      tagsToAdd: ["calmline_screen_pending"],
      tagsToRemove: [],
      reviewState: "pending",
      publicComment: null,
      status: null,
    },
    ...overrides,
  };
}

function payload(text: string): string {
  return JSON.stringify({
    account: { subdomain: "example" },
    ticket: { id: 4, via: { channel: "email" } },
    comment: {
      id: 100,
      plain_body: text,
      public: true,
      created_at: "2026-11-10T18:30:00Z",
      author: { role: "end-user" },
    },
  });
}

async function post(database: MemoryBoundaryDatabase, body: string, headers: Record<string, string>) {
  return handleBoundaryWebhook(new Request("http://localhost/api/zendesk/boundary-shield/webhook", {
    method: "POST",
    headers,
    body,
  }), { secret: SECRET, now: NOW, database });
}

test("concurrent deliveries commit once and stuck tickets stay pending", async () => {
  const database = new MemoryBoundaryDatabase();
  const first = decision({ commentId: "1", createdAt: "2026-11-10T17:00:00Z" });
  const audit = {
    at: first.createdAt,
    accountId: first.accountId,
    ticketId: first.ticketId,
    commentId: first.commentId,
    type: "held" as const,
    state: first.state,
    severity: first.severity,
    effect: first.effect,
    reason: first.reason,
    executed: false as const,
  };
  const [one, two] = await Promise.all([
    database.commit({ deliveryId: "delivery-1", decision: first, audit }),
    database.commit({ deliveryId: "delivery-1", decision: first, audit }),
  ]);
  assert.equal([one.duplicate, two.duplicate].filter(Boolean).length, 1);
  assert.equal(one.executed, false);
  assert.equal(two.executed, false);
  const stuck = await database.noteStuck(NOW, 15 * 60 * 1000);
  assert.equal(stuck.length, 1);
  assert.equal(stuck[0]?.state, "pending");
  const after = await database.listTicket("example", "4");
  assert.equal(after[0]?.state, "pending");
  assert.equal(after[0]?.effect, "hold-pending");
  const again = await database.noteStuck(NOW, 15 * 60 * 1000);
  assert.equal(again.length, 0);
});

test("the webhook verifies signature, tenant, and replay without writing to Zendesk", async () => {
  const database = new MemoryBoundaryDatabase();
  await database.saveInstallation({
    subdomain: "example",
    reviewGroupId: "701",
    normalGroupId: "702",
    sealedAccessToken: "sealed-token-not-a-real-secret",
  });
  const body = payload(INSULT);
  const timestamp = NOW.toISOString();
  const headers = {
    "x-zendesk-webhook-signature": signZendeskWebhook(SECRET, timestamp, body),
    "x-zendesk-webhook-signature-timestamp": timestamp,
    "x-zendesk-webhook-invocation-id": "invocation-1",
  };
  const accepted = await post(database, body, headers);
  const replay = await post(database, body, headers);
  const acceptedBody = await accepted.json() as { state: string; duplicate: boolean; released: boolean; zendeskWrite: string };
  const replayBody = await replay.json() as { duplicate: boolean; released: boolean };
  assert.equal(accepted.status, 200);
  assert.equal(acceptedBody.state, "protected");
  assert.equal(acceptedBody.released, false);
  assert.equal(acceptedBody.zendeskWrite, "disabled");
  assert.equal(WEBHOOK_WRITES_ENABLED, false);
  assert.equal(replay.status, 200);
  assert.equal(replayBody.duplicate, true);
  assert.equal(replayBody.released, false);
  assert.equal(JSON.stringify(acceptedBody).includes(INSULT), false);
  assert.equal(JSON.stringify(await database.listTicket("example", "4")).includes(INSULT), false);
  assert.equal(JSON.stringify(await database.listTicket("example", "4")).includes("sealed-token"), false);

  const rejected = await post(database, body, { ...headers, "x-zendesk-webhook-signature": "bad" });
  assert.equal(rejected.status, 401);
  const unknown = await post(database, payload(INSULT).replace("example", "other"), {
    ...headers,
    "x-zendesk-webhook-signature": signZendeskWebhook(SECRET, timestamp, payload(INSULT).replace("example", "other")),
  });
  assert.equal(unknown.status, 401);
  const missing = await handleBoundaryWebhook(new Request("http://localhost/api/zendesk/boundary-shield/webhook", { method: "POST", body: "{}" }), {
    secret: "",
    now: NOW,
    database: null,
  });
  assert.equal(missing.status, 503);
});

test("the database commit rejects message text and the migration stays private", async () => {
  const database = new MemoryBoundaryDatabase();
  const leaked = decision();
  await assert.rejects(() => database.commit({
    deliveryId: "delivery-2",
    decision: leaked,
    audit: {
      at: leaked.createdAt,
      accountId: leaked.accountId,
      ticketId: leaked.ticketId,
      commentId: leaked.commentId,
      type: "held",
      state: "pending",
      severity: "unclassified",
      effect: "hold-pending",
      reason: "classification-failed",
      executed: false,
      text: INSULT,
    } as never,
  }));
  const calls: unknown[] = [];
  const remote = createSupabaseBoundaryDatabase({
    rpc: async (_fn, args) => {
      calls.push(args.payload);
      return { data: { duplicate: false, state: "protected", effect: "hold-for-review" }, error: null };
    },
    installation: async () => null,
    ticket: async () => [],
  });
  await remote.commit({
    deliveryId: "delivery-3",
    decision: decision({ state: "protected", effect: "hold-for-review", reason: "qualifying-customer-email", blocksRelease: false }),
    audit: {
      at: NOW.toISOString(),
      accountId: "example",
      ticketId: "4",
      commentId: "100",
      type: "classified",
      state: "protected",
      severity: "insult",
      effect: "hold-for-review",
      reason: "qualifying-customer-email",
      executed: false,
    },
  });
  assert.equal(JSON.stringify(calls).includes(INSULT), false);
  const migration = fs.readFileSync("supabase/migrations/008_boundary_shield_routing.sql", "utf8");
  assert.match(migration, /enable row level security/);
  assert.match(migration, /primary key \(account_id, delivery_id\)/);
  assert.match(migration, /primary key \(account_id, ticket_id, comment_id\)/);
  assert.match(migration, /executed = false/);
  assert.match(migration, /revoke all on table public.boundary_decisions from public, anon, authenticated/);
  assert.match(migration, /payload \? 'plain_body'/);
  assert.equal(migration.split("create or replace function")[0]?.includes("plain_body"), false);
  assert.equal(migration.includes("calmlinellc"), false);
  assert.equal(migration.includes("set search_path = ''"), true);
  assert.match(migration, /revoke all on function public\.boundary_shield_commit\(jsonb\) from public, anon, authenticated/);
  assert.match(migration, /revoke all on function public\.boundary_shield_note_stuck\(interval\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.boundary_shield_commit\(jsonb\) to service_role/);
  assert.match(migration, /grant execute on function public\.boundary_shield_note_stuck\(interval\) to service_role/);
  assert.equal(/grant execute[\s\S]*to (anon|authenticated|public)/i.test(migration), false);
  for (const name of ["call_events", "call_sessions", "call_outcomes", "policies", "policy_chunks", "transcripts"]) {
    assert.equal(new RegExp(`\\b(table|from|into|update|join)\\s+(public\\.)?${name}\\b`, "i").test(migration), false, name);
  }
  assert.equal(/\bdrop\s+(table|function)\b/i.test(migration), false);
  assert.equal(/\bdelete\s+from\b/i.test(migration), false);
  const sidebar = fs.readFileSync("zendesk-app/src/app.ts", "utf8");
  assert.equal(sidebar.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
  assert.equal(sidebar.includes("BOUNDARY_WEBHOOK_SECRET"), false);
  assert.equal(fs.readFileSync("src/lib/boundary-shield/webhookEndpoint.ts", "utf8").includes("WEBHOOK_WRITES_ENABLED = false"), true);
});
