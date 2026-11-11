import assert from "node:assert/strict";
import test from "node:test";
import {
  EmailRoutingWorkflow,
  receiveEmailRoutingWebhook,
  ROUTING_WRITES_ENABLED,
  type RoutingEvent,
} from "./emailRouting";
import { signZendeskWebhook } from "./zendeskWebhookSignature";

const NOW = new Date("2026-11-10T18:00:00Z");
const SECRET = "test-signing-secret";
const INSULT = "You're an idiot.";

function event(text: string, overrides: Partial<RoutingEvent> = {}): RoutingEvent {
  return {
    accountId: "acme",
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

function payload(text: string, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    account: { subdomain: "acme" },
    ticket: { id: 4, via: { channel: "email" } },
    comment: {
      id: 100,
      body: text,
      public: true,
      created_at: "2026-11-10T18:00:00Z",
      author: { role: "end-user" },
    },
    ...overrides,
  });
}

function receive(body: string, workflow: EmailRoutingWorkflow, overrides: { signature?: string; timestamp?: string } = {}) {
  const timestamp = overrides.timestamp ?? NOW.toISOString();
  return receiveEmailRoutingWebhook({
    secret: SECRET,
    timestamp,
    signature: overrides.signature ?? signZendeskWebhook(SECRET, timestamp, body),
    body,
    now: NOW,
    workflow,
  });
}

test("ordinary email is cleared and a qualifying email is protected without writing", () => {
  const workflow = new EmailRoutingWorkflow({ reviewGroupId: "44", normalGroupId: "10" });
  const ordinary = workflow.handle(event("This is ridiculous. Your company is useless and I want a refund."), NOW.toISOString());
  const ambiguous = workflow.handle(event("I will sue you and you will hear from my lawyer.", { commentId: "101" }), NOW.toISOString());
  const insult = workflow.handle(event(INSULT, { ticketId: "5", commentId: "102" }), NOW.toISOString());
  const harassment = workflow.handle(event("You are disgusting.", { ticketId: "6", commentId: "103" }), NOW.toISOString());
  const discrimination = workflow.handle(event("Go back to your country.", { ticketId: "7", commentId: "104" }), NOW.toISOString());
  const threat = workflow.handle(event("I know where you live.", { ticketId: "8", commentId: "105" }), NOW.toISOString());

  assert.equal(workflow.writesEnabled, false);
  assert.equal(ROUTING_WRITES_ENABLED, false);
  assert.equal(ordinary.state, "clear");
  assert.equal(ordinary.effect, "release-to-normal-queue");
  assert.equal(ordinary.update.groupId, "10");
  assert.equal(ordinary.update.assigneeId, null);
  assert.equal(ordinary.update.publicComment, null);
  assert.equal(ordinary.update.status, null);
  assert.equal(ordinary.executed, false);
  assert.equal(ambiguous.state, "clear");
  for (const decision of [insult, harassment, discrimination, threat]) {
    assert.equal(decision.state, "protected");
    assert.equal(decision.effect, "hold-for-review");
    assert.equal(decision.update.groupId, "44");
    assert.equal(decision.update.executed, false);
    assert.equal(decision.update.publicComment, null);
    assert.deepEqual(decision.update.tagsToAdd, ["calmline_protected_queue"]);
  }
  assert.equal(insult.severity, "insult");
  assert.equal(harassment.severity, "harassment");
  assert.equal(discrimination.severity, "discrimination");
  assert.equal(threat.severity, "threat");
  const visible = JSON.stringify(workflow.audit());
  assert.equal(visible.includes(INSULT), false);
  assert.equal(visible.includes("idiot"), false);
  assert.equal(visible.includes("disgusting"), false);
});

test("duplicate delivery does not route the same comment twice", () => {
  const workflow = new EmailRoutingWorkflow({ reviewGroupId: "44", normalGroupId: "10" });
  const first = workflow.handle(event(INSULT), NOW.toISOString());
  const second = workflow.handle(event(INSULT), NOW.toISOString());
  assert.equal(first.state, "protected");
  assert.equal(second, first);
  assert.equal(workflow.audit().filter((item) => item.type === "classified").length, 1);
  assert.equal(workflow.audit().filter((item) => item.type === "duplicate").length, 1);
  const later = workflow.handle(event("You are disgusting.", { commentId: "200", createdAt: "2026-11-10T18:10:00Z" }), NOW.toISOString());
  assert.equal(later.state, "protected");
  assert.equal(later.commentId, "200");
  assert.notEqual(later, first);
});

test("staff mail and uncertain senders stay held and are not labeled as customer abuse", () => {
  const workflow = new EmailRoutingWorkflow({ reviewGroupId: "44", normalGroupId: "10" });
  const agent = workflow.handle(event(INSULT, { authorRole: "agent", commentId: "301" }), NOW.toISOString());
  const admin = workflow.handle(event(INSULT, { authorRole: "admin", commentId: "302" }), NOW.toISOString());
  const unknown = workflow.handle(event(INSULT, { authorRole: "", commentId: "303" }), NOW.toISOString());
  for (const decision of [agent, admin, unknown]) {
    assert.equal(decision.state, "pending");
    assert.equal(decision.effect, "hold-pending");
    assert.equal(decision.severity, "unclassified");
    assert.equal(decision.update.groupId, "44");
    assert.equal(decision.executed, false);
  }
  assert.equal(agent.reason, "staff-not-customer");
  assert.equal(unknown.reason, "uncertain-sender");
});

test("a classification failure remains held and a retry cannot release it", () => {
  const workflow = new EmailRoutingWorkflow({
    reviewGroupId: "44",
    normalGroupId: "10",
    classify: () => {
      throw new Error("classifier unavailable");
    },
  });
  const failed = workflow.handle(event("This is a normal refund request."), NOW.toISOString());
  const retry = workflow.handle(event("This is a normal refund request."), NOW.toISOString());
  assert.equal(failed.state, "pending");
  assert.equal(failed.effect, "hold-pending");
  assert.equal(failed.reason, "classification-failed");
  assert.equal(failed.update.groupId, "44");
  assert.deepEqual(failed.update.tagsToRemove, []);
  assert.equal(retry.state, "pending");
  assert.equal(retry.effect, "hold-pending");
  assert.equal(JSON.stringify(workflow.audit()).includes("normal refund"), false);
});

test("a signed webhook is accepted and an invalid signature releases nothing", () => {
  const workflow = new EmailRoutingWorkflow({ reviewGroupId: "44", normalGroupId: "10" });
  const body = payload(INSULT);
  const accepted = receive(body, workflow);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.decision?.state, "protected");
  assert.equal(accepted.decision?.executed, false);
  assert.equal(JSON.stringify(accepted).includes(INSULT), false);

  const rejected = receive(body, workflow, { signature: "not-a-real-signature" });
  assert.equal(rejected.status, 401);
  assert.equal(rejected.decision, null);

  const stale = receive(body, workflow, { timestamp: "2026-11-10T17:00:00Z" });
  assert.equal(stale.status, 401);
  assert.equal(stale.decision, null);

  const broken = receive("{", workflow);
  assert.equal(broken.status, 400);
  assert.equal(broken.decision, null);
  assert.equal(workflow.audit().every((item) => item.executed === false), true);
});
