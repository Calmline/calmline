import assert from "node:assert/strict";
import test from "node:test";
import { MemoryBoundaryDatabase } from "./boundaryDatabase";
import { ROUTING_WRITES_ENABLED } from "./emailRouting";
import { sealSecret } from "./zendeskOAuth";
import { readZendeskComment } from "./zendeskRead";
import { handleBoundaryWebhook, WEBHOOK_WRITES_ENABLED } from "./webhookEndpoint";
import { signZendeskWebhook } from "./zendeskWebhookSignature";

const NOW = new Date("2026-11-10T18:30:00Z");
const SECRET = "staging-webhook-secret";
const KEY = Buffer.alloc(32, 4);
const INSULT = "You're an idiot.";

function comment(id: number, text = "earlier note") {
  return {
    id,
    plain_body: text,
    public: true,
    author_id: 55,
    created_at: "2026-11-10T18:30:00Z",
    via: { channel: "email" },
  };
}

test("the Zendesk reader lists comments with GET and loads the matching author", async () => {
  const methods: string[] = [];
  const record = await readZendeskComment({
    subdomain: "example",
    accessToken: "access-token",
    ticketId: "4",
    commentId: "100",
    transport: async (request) => {
      methods.push(request.method);
      assert.equal(request.url.includes("/comments/100"), false);
      if (request.url === "https://example.zendesk.com/api/v2/tickets/4/comments.json") {
        return { status: 200, body: { comments: [comment(100, INSULT)], next_page: null } };
      }
      assert.equal(request.url, "https://example.zendesk.com/api/v2/users/55.json");
      return { status: 200, body: { user: { role: "end-user" } } };
    },
  });
  assert.deepEqual(methods, ["GET", "GET"]);
  assert.equal(record.text, INSULT);
  assert.equal(record.authorRole, "end-user");
  assert.equal(record.publicComment, true);
});

test("a comment on a later page is found and an off-site page is not requested", async () => {
  const urls: string[] = [];
  const record = await readZendeskComment({
    subdomain: "example",
    accessToken: "access-token",
    ticketId: "4",
    commentId: "100",
    transport: async (request) => {
      urls.push(request.url);
      assert.equal(request.method, "GET");
      if (request.url.endsWith("/comments.json")) {
        return {
          status: 200,
          body: {
            comments: [comment(1)],
            next_page: "https://example.zendesk.com/api/v2/tickets/4/comments.json?page=2",
            links: { next: "https://evil.example/api/v2/tickets/4/comments.json" },
          },
        };
      }
      if (request.url.includes("evil.example")) throw new Error("off-site page was requested");
      if (request.url.endsWith("?page=2")) {
        return { status: 200, body: { comments: [comment(100, INSULT)], next_page: null } };
      }
      assert.equal(request.url, "https://example.zendesk.com/api/v2/users/55.json");
      return { status: 200, body: { user: { role: "end-user" } } };
    },
  });
  assert.deepEqual(urls, [
    "https://example.zendesk.com/api/v2/tickets/4/comments.json",
    "https://example.zendesk.com/api/v2/tickets/4/comments.json?page=2",
    "https://example.zendesk.com/api/v2/users/55.json",
  ]);
  assert.equal(record.text, INSULT);
});

test("a missing comment or a Zendesk error does not return comment text", async () => {
  await assert.rejects(() => readZendeskComment({
    subdomain: "example",
    accessToken: "access-token",
    ticketId: "4",
    commentId: "100",
    transport: async () => ({ status: 200, body: { comments: [comment(1)], next_page: null } }),
  }));
  const urls: string[] = [];
  await assert.rejects(() => readZendeskComment({
    subdomain: "example",
    accessToken: "access-token",
    ticketId: "4",
    commentId: "100",
    transport: async (request) => {
      urls.push(request.url);
      return { status: 503, body: { error: "unavailable" } };
    },
  }));
  assert.deepEqual(urls, ["https://example.zendesk.com/api/v2/tickets/4/comments.json"]);
});

test("an identifier-only webhook retrieves the comment before screening", async () => {
  const database = new MemoryBoundaryDatabase();
  await database.saveInstallation({
    subdomain: "example",
    reviewGroupId: "701",
    normalGroupId: "702",
    sealedAccessToken: sealSecret("access-token", KEY),
  });
  const body = JSON.stringify({
    account: { subdomain: "example" },
    ticket: { id: "4" },
    comment: { id: "100" },
  });
  let lookedUp = false;
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
    readComment: async (input) => {
      lookedUp = true;
      assert.equal(input.accessToken, "access-token");
      assert.equal(input.ticketId, "4");
      assert.equal(input.commentId, "100");
      return readZendeskComment({
        ...input,
        transport: async (request) => {
          assert.equal(request.method, "GET");
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
                next_page: null,
              },
            };
          }
          return { status: 200, body: { user: { role: "end-user" } } };
        },
      });
    },
  });
  const payload = await response.json() as { state: string; released: boolean; executed: boolean; zendeskWrite: string };
  assert.equal(response.status, 200);
  assert.equal(lookedUp, true);
  assert.equal(payload.state, "protected");
  assert.equal(payload.released, false);
  assert.equal(payload.executed, false);
  assert.equal(payload.zendeskWrite, "disabled");
  assert.equal(WEBHOOK_WRITES_ENABLED, false);
  assert.equal(ROUTING_WRITES_ENABLED, false);
  assert.equal(JSON.stringify(payload).includes(INSULT), false);
  assert.equal(JSON.stringify(await database.listTicket("example", "4")).includes(INSULT), false);
});

test("a failed comment lookup does not release or update the ticket", async () => {
  const database = new MemoryBoundaryDatabase();
  await database.saveInstallation({
    subdomain: "example",
    reviewGroupId: "701",
    normalGroupId: "702",
    sealedAccessToken: sealSecret("access-token", KEY),
  });
  const body = JSON.stringify({
    account: { subdomain: "example" },
    ticket: { id: "4" },
    comment: { id: "100" },
  });
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
    readComment: async () => {
      throw new Error("Zendesk comment lookup failed");
    },
  });
  const payload = await response.json() as { accepted: boolean; released: boolean; executed: boolean; zendeskWrite: string };
  assert.equal(response.status, 503);
  assert.equal(payload.accepted, false);
  assert.equal(payload.released, false);
  assert.equal(payload.executed, false);
  assert.equal(payload.zendeskWrite, "disabled");
  assert.equal((await database.listTicket("example", "4")).length, 0);
});
