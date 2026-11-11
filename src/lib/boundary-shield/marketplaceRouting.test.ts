import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { EmailRoutingWorkflow, type RoutingEvent } from "./emailRouting";
import { receiveMarketplaceWebhook } from "./marketplaceRouting";
import { FileRoutingStore } from "./routingStore";
import { EmailScreeningLedger } from "./screening";
import { exchangeAuthorizationCode, sealSecret, openSecret, zendeskAuthorizeUrl } from "./zendeskOAuth";
import { ZendeskRoutingAdapter } from "./zendeskRoutingClient";
import { signZendeskWebhook } from "./zendeskWebhookSignature";

const NOW = new Date("2026-11-10T18:00:00Z");
const SECRET = "app-webhook-secret";
const INSULT = "You're an idiot.";
const REVIEW = "701";
const NORMAL = "702";

function event(text: string, overrides: Partial<RoutingEvent> = {}): RoutingEvent {
  return {
    accountId: "example",
    ticketId: "4",
    commentId: "100",
    channel: "email",
    authorRole: "end-user",
    publicComment: true,
    text,
    createdAt: "2026-11-10T18:00:00Z",
    ...overrides,
  };
}

function bodyFor(text: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    account: { subdomain: "example" },
    ticket: { id: 4, via: { channel: "email" } },
    comment: {
      id: 100,
      plain_body: text,
      public: true,
      created_at: "2026-11-10T18:00:00Z",
      author: { role: "end-user" },
    },
    ...overrides,
  });
}

test("durable storage is tenant isolated and does not keep customer text", () => {
  const root = mkdtempSync(path.join(tmpdir(), "boundary-shield-"));
  const store = new FileRoutingStore(root);
  let calls = 0;
  const ledger = new EmailScreeningLedger({ mode: "protected-routing", reviewGroupId: REVIEW });
  const first = new EmailRoutingWorkflow({
    reviewGroupId: REVIEW,
    normalGroupId: NORMAL,
    store,
    classify: (input) => {
      calls += 1;
      return ledger.classify(input);
    },
  });
  first.handle(event(INSULT), NOW.toISOString());
  const reopened = new EmailRoutingWorkflow({
    reviewGroupId: REVIEW,
    normalGroupId: NORMAL,
    store,
    classify: () => {
      calls += 1;
      throw new Error("should reuse the stored decision");
    },
  });
  const again = reopened.handle(event(INSULT), NOW.toISOString());
  assert.equal(calls, 1);
  assert.equal(again.state, "protected");
  assert.equal(again.executed, false);
  const saved = readFileSync(path.join(root, "example", "routing.json"), "utf8");
  assert.equal(saved.includes(INSULT), false);
  assert.equal(saved.includes("idiot"), false);
  assert.equal(store.listTicket("other-example", "4").length, 0);
  assert.throws(() => store.listTicket("../example", "4"));
});

test("out-of-order events cannot release a protected or failed ticket", () => {
  const workflow = new EmailRoutingWorkflow({ reviewGroupId: REVIEW, normalGroupId: NORMAL });
  const threat = workflow.handle(event("I know where you live.", { commentId: "2", createdAt: "2026-11-10T18:05:00Z" }), NOW.toISOString());
  const lateClear = workflow.handle(event("Thanks, I still need a refund.", { commentId: "1", createdAt: "2026-11-10T18:00:00Z" }), NOW.toISOString());
  assert.equal(threat.state, "protected");
  assert.equal(lateClear.effect, "hold-pending");
  assert.equal(lateClear.reason, "release-blocked");
  assert.equal(workflow.ticketState("example", "4"), "protected");

  let down = true;
  const ledger = new EmailScreeningLedger({ mode: "protected-routing", reviewGroupId: REVIEW });
  const failing = new EmailRoutingWorkflow({
    reviewGroupId: REVIEW,
    normalGroupId: NORMAL,
    classify: (input) => {
      if (down) throw new Error("classifier down");
      return ledger.classify(input);
    },
  });
  failing.handle(event("Please help with my order.", { ticketId: "9", commentId: "50", createdAt: "2026-11-10T18:02:00Z" }), NOW.toISOString());
  down = false;
  const blocked = failing.handle(event("This is ridiculous. Your company is useless and I want a refund.", {
    ticketId: "9",
    commentId: "51",
    createdAt: "2026-11-10T18:03:00Z",
  }), NOW.toISOString());
  assert.equal(blocked.reason, "release-blocked");
  assert.equal(failing.ticketState("example", "9"), "pending");
});

test("a failed classification can be recovered without releasing over an open incident", () => {
  let down = true;
  const ledger = new EmailScreeningLedger({ mode: "protected-routing", reviewGroupId: REVIEW });
  const workflow = new EmailRoutingWorkflow({
    reviewGroupId: REVIEW,
    normalGroupId: NORMAL,
    classify: (input) => {
      if (down) throw new Error("down");
      return ledger.classify(input);
    },
  });
  const failed = workflow.handle(event("This is ridiculous. Your company is useless and I want a refund."), NOW.toISOString());
  assert.equal(failed.reason, "classification-failed");
  down = false;
  const recovered = workflow.recover(event("This is ridiculous. Your company is useless and I want a refund."), NOW.toISOString());
  assert.equal(recovered.state, "clear");
  assert.equal(recovered.executed, false);
});

test("marketplace webhooks retry safely and do not call Zendesk while writes are disabled", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "boundary-shield-"));
  const store = new FileRoutingStore(root);
  const calls: Array<{ url: string; body: string; token: string }> = [];
  const adapter = new ZendeskRoutingAdapter(async (request) => {
    calls.push({ url: request.url, body: request.body, token: request.token });
    return { status: 200 };
  }, false);
  const installation = { subdomain: "example", reviewGroupId: REVIEW, normalGroupId: NORMAL, webhookSecret: SECRET };
  const payload = bodyFor(INSULT);
  const timestamp = NOW.toISOString();
  const receipt = await receiveMarketplaceWebhook({
    appSecret: SECRET,
    timestamp,
    signature: signZendeskWebhook(SECRET, timestamp, payload),
    body: payload,
    deliveryId: "delivery-1",
    now: NOW,
    store,
    installations: [installation],
    adapter,
    accessToken: "should-not-be-sent",
  });
  const replay = await receiveMarketplaceWebhook({
    appSecret: SECRET,
    timestamp,
    signature: signZendeskWebhook(SECRET, timestamp, payload),
    body: payload,
    deliveryId: "delivery-1",
    now: NOW,
    store,
    installations: [installation],
    adapter,
  });
  assert.equal(receipt.disposition, "protected");
  assert.equal(receipt.write?.executed, false);
  assert.equal(receipt.write?.reason, "writes-disabled");
  assert.equal(replay.decision?.commentId, "100");
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(store.listAudit("example")).includes(INSULT), false);
  const rejected = await receiveMarketplaceWebhook({
    appSecret: SECRET,
    timestamp,
    signature: "bad",
    body: payload,
    deliveryId: "delivery-2",
    now: NOW,
    store,
    installations: [installation],
    adapter,
  });
  assert.equal(rejected.status, 401);
  assert.equal(rejected.write, null);
});

test("an enabled adapter uses the tenant groups, retries transport failures, and never sends the message", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "boundary-shield-"));
  const store = new FileRoutingStore(root);
  const calls: string[] = [];
  let status = 503;
  const adapter = new ZendeskRoutingAdapter(async (request) => {
    calls.push(request.body);
    return { status };
  }, true);
  const installation = { subdomain: "example", reviewGroupId: REVIEW, normalGroupId: NORMAL, webhookSecret: SECRET };
  const payload = bodyFor("This is ridiculous. Your company is useless and I want a refund.");
  const timestamp = NOW.toISOString();
  const first = await receiveMarketplaceWebhook({
    appSecret: SECRET,
    timestamp,
    signature: signZendeskWebhook(SECRET, timestamp, payload),
    body: payload,
    deliveryId: "delivery-clear",
    now: NOW,
    store,
    installations: [installation],
    adapter,
    accessToken: "tenant-token",
  });
  assert.equal(first.write?.reason, "retryable");
  assert.equal(first.write?.executed, false);
  status = 200;
  const second = await receiveMarketplaceWebhook({
    appSecret: SECRET,
    timestamp,
    signature: signZendeskWebhook(SECRET, timestamp, payload),
    body: payload,
    deliveryId: "delivery-clear",
    now: NOW,
    store,
    installations: [installation],
    adapter,
    accessToken: "tenant-token",
  });
  assert.equal(second.write?.executed, true);
  assert.equal(calls.length, 2);
  const sent = JSON.parse(calls[1] ?? "{}") as { ticket: Record<string, unknown> };
  assert.equal(sent.ticket.group_id, Number(NORMAL));
  assert.equal(sent.ticket.assignee_id, null);
  assert.equal("comment" in sent.ticket, false);
  assert.equal("status" in sent.ticket, false);
  assert.equal(JSON.stringify(sent).includes("ridiculous"), false);
  const saved = readFileSync(path.join(root, "example", "routing.json"), "utf8");
  assert.equal(saved.includes("tenant-token"), false);

  const missing = new ZendeskRoutingAdapter(async () => {
    throw new Error("should not be called");
  }, true);
  const refused = await missing.apply({
    subdomain: "example",
    accessToken: "tenant-token",
    ticketId: "4",
    disposition: "clear",
    reviewGroupId: "",
    normalGroupId: "",
  });
  assert.equal(refused.reason, "missing-group");
});

test("OAuth is per subdomain and tokens are sealed before they touch disk", async () => {
  const url = zendeskAuthorizeUrl({
    subdomain: "Example",
    clientId: "marketplace-client",
    redirectUri: "https://app.example.com/zendesk/oauth/callback",
    state: "state-1",
  });
  assert.match(url, /^https:\/\/example\.zendesk\.com\/oauth\/authorizations\/new/);
  assert.equal(url.includes("example.zendesk.com"), true);
  const token = await exchangeAuthorizationCode({
    subdomain: "example",
    clientId: "marketplace-client",
    clientSecret: "client-secret",
    code: "code-1",
    redirectUri: "https://app.example.com/zendesk/oauth/callback",
    transport: async (request) => {
      assert.equal(request.url, "https://example.zendesk.com/oauth/tokens");
      return { status: 200, body: { access_token: "raw-access-token", refresh_token: "raw-refresh", scope: "read write" } };
    },
  });
  const key = Buffer.alloc(32, 7);
  const sealed = sealSecret(JSON.stringify(token), key);
  const file = path.join(mkdtempSync(path.join(tmpdir(), "boundary-shield-oauth-")), "token.seal");
  writeFileSync(file, sealed);
  const disk = readFileSync(file, "utf8");
  assert.equal(disk.includes("raw-access-token"), false);
  assert.equal(disk.includes("raw-refresh"), false);
  const opened = JSON.parse(openSecret(disk, key)) as { accessToken: string };
  assert.equal(opened.accessToken, "raw-access-token");
  assert.throws(() => zendeskAuthorizeUrl({
    subdomain: "https://evil.example",
    clientId: "marketplace-client",
    redirectUri: "https://app.example.com/zendesk/oauth/callback",
    state: "state-2",
  }));
});

test("the example customer group ids are not product defaults", () => {
  const sources = [
    "emailRouting.ts",
    "marketplaceRouting.ts",
    "routingStore.ts",
    "zendeskOAuth.ts",
    "zendeskRoutingClient.ts",
  ].map((name) => readFileSync(path.join("src/lib/boundary-shield", name), "utf8")).join("\n");
  assert.equal(sources.includes("50291152444301"), false);
  assert.equal(sources.includes("50273229341453"), false);
  assert.equal(sources.includes("calmlinellc"), false);
});
