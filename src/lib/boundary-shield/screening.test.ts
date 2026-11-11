import assert from "node:assert/strict";
import test from "node:test";
import { EmailScreeningLedger } from "./screening";

const INSULT = "You're an idiot.";

test("ordinary frustration stays clear and proposes no hold", () => {
  const ledger = new EmailScreeningLedger({ mode: "protected-routing", reviewGroupId: "44" });
  const result = ledger.classify({
    ticketId: "4",
    segmentId: "c1",
    speaker: "customer",
    text: "This is ridiculous. Your company is useless and I want a refund.",
    timestamp: "2026-11-10T01:00:00Z",
  });
  assert.equal(result.severity, "none");
  assert.equal(result.reviewState, "clear");
  assert.equal(result.proposed.effect, "leave-in-normal-queue");
  assert.equal(result.proposed.executed, false);
  assert.equal(result.proposed.tag, null);
  assert.equal(ledger.writesEnabled, false);
});

test("protected routing proposes a hold for each abuse severity without writing", () => {
  const cases = [
    ["You're an idiot.", "insult"],
    ["You are disgusting.", "harassment"],
    ["Go back to your country.", "discrimination"],
    ["I know where you live.", "threat"],
  ] as const;
  cases.forEach(([text, severity], index) => {
    const ledger = new EmailScreeningLedger({ mode: "protected-routing", reviewGroupId: "44" });
    const result = ledger.classify({
      ticketId: String(index),
      segmentId: `s-${index}`,
      speaker: "customer",
      text,
      timestamp: "2026-11-10T01:01:00Z",
    });
    assert.equal(result.severity, severity);
    assert.equal(result.reviewState, "pending-review");
    assert.equal(result.proposed.effect, "hold-for-review");
    assert.equal(result.proposed.tag, "calmline_protected_queue");
    assert.equal(result.proposed.reviewGroupId, "44");
    assert.equal(result.proposed.executed, false);
  });
});

test("monitor mode records abuse and does not propose routing", () => {
  const ledger = new EmailScreeningLedger({ mode: "monitor", reviewGroupId: "44" });
  const result = ledger.classify({
    ticketId: "9",
    segmentId: "m1",
    speaker: "customer",
    text: INSULT,
    timestamp: "2026-11-10T01:02:00Z",
  });
  assert.equal(result.severity, "insult");
  assert.equal(result.reviewState, "flagged");
  assert.equal(result.proposed.effect, "observe");
  assert.equal(result.proposed.tag, null);
  assert.equal(result.proposed.reviewGroupId, null);
});

test("agent mail and duplicate replies do not create another hold", () => {
  const ledger = new EmailScreeningLedger({ mode: "protected-routing", reviewGroupId: "44" });
  const agent = ledger.classify({
    ticketId: "4",
    segmentId: "a1",
    speaker: "agent",
    text: INSULT,
    timestamp: "2026-11-10T01:03:00Z",
  });
  const first = ledger.classify({
    ticketId: "4",
    segmentId: "c1",
    speaker: "customer",
    text: INSULT,
    timestamp: "2026-11-10T01:04:00Z",
  });
  const again = ledger.classify({
    ticketId: "4",
    segmentId: "c1",
    speaker: "customer",
    text: INSULT,
    timestamp: "2026-11-10T01:04:00Z",
  });
  assert.equal(agent.severity, "none");
  assert.equal(agent.ignoredSpeaker, true);
  assert.equal(first.reviewState, "pending-review");
  assert.equal(again.duplicate, true);
  assert.equal(again.reviewState, "pending-review");
  assert.equal(ledger.audit().filter((event) => event.type === "classified").length, 1);
  const reply = ledger.classify({
    ticketId: "4",
    segmentId: "a2",
    speaker: "agent",
    text: "I am sorry you are upset.",
    timestamp: "2026-11-10T01:04:30Z",
  });
  assert.equal(reply.severity, "insult");
  assert.equal(reply.reviewState, "pending-review");
  assert.equal(reply.ignoredSpeaker, true);
});

test("supervisor actions stay local and the audit omits message text", () => {
  const ledger = new EmailScreeningLedger({ mode: "protected-routing", reviewGroupId: "44" });
  ledger.classify({
    ticketId: "4",
    segmentId: "c1",
    speaker: "customer",
    text: INSULT,
    timestamp: "2026-11-10T01:05:00Z",
  });
  const approved = ledger.review("4", "approve", "2026-11-10T01:06:00Z");
  const escalated = ledger.review("4", "escalate", "2026-11-10T01:07:00Z");
  const dismissed = ledger.review("4", "dismiss", "2026-11-10T01:08:00Z");
  const released = ledger.review("4", "release", "2026-11-10T01:09:00Z");
  assert.equal(approved?.reviewState, "approved");
  assert.equal(approved?.proposed.effect, "hold-for-review");
  assert.equal(escalated?.reviewState, "escalated");
  assert.equal(escalated?.proposed.executed, false);
  assert.equal(dismissed?.proposed.effect, "release-to-assignment");
  assert.equal(released?.reviewState, "released");
  const serialized = JSON.stringify(ledger.audit());
  assert.equal(serialized.includes(INSULT), false);
  assert.equal(serialized.includes("idiot"), false);
  assert.equal(ledger.audit().every((event) => event.proposed.executed === false), true);
});
