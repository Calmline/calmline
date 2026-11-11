import assert from "node:assert/strict";
import test from "node:test";
import { BoundaryShieldSessionStore } from "./engine";
import { SYNTHETIC_CALLS } from "./syntheticCalls";
import { ingestZendeskSidebarEvent, ZENDESK_VOICE_INTEGRATION } from "./zendeskAdapter";
import type { TranscriptSegment } from "./types";

function segment(overrides: Partial<TranscriptSegment> & Pick<TranscriptSegment, "text">): TranscriptSegment {
  return {
    segmentId: overrides.segmentId ?? "seg-1",
    conversationId: overrides.conversationId ?? "call-1",
    speaker: overrides.speaker ?? "customer",
    text: overrides.text,
    timestamp: overrides.timestamp ?? "2026-01-01T00:00:00Z",
  };
}

function play(store: BoundaryShieldSessionStore, segments: TranscriptSegment[]) {
  return segments.map((item) => store.ingest(item));
}

test("ordinary complaints do not alert", () => {
  const store = new BoundaryShieldSessionStore();
  const scenario = SYNTHETIC_CALLS.find((call) => call.id === "normal-complaint");
  assert.ok(scenario);
  const results = play(store, scenario.segments);
  assert.equal(results.some((result) => result.alert), false);
  assert.equal(store.getState("call-normal")?.rung, "clear");
});

test("a straight or curly apostrophe in the same insult is detected", () => {
  const straight = new BoundaryShieldSessionStore();
  const curly = new BoundaryShieldSessionStore();
  const straightResult = straight.ingest(
    segment({ text: "You're an idiot.", segmentId: "straight", conversationId: "apostrophe-straight" }),
  );
  const curlyResult = curly.ingest(
    segment({
      text: "You\u2019re an idiot.",
      segmentId: "curly",
      conversationId: "apostrophe-curly",
      timestamp: "2026-01-01T00:00:05Z",
    }),
  );
  assert.equal(straightResult.alert?.rung, "first_warning");
  assert.equal(straightResult.alert?.kind, "insult");
  assert.equal(curlyResult.alert?.rung, "first_warning");
  assert.equal(curlyResult.alert?.kind, "insult");
});

test("discriminatory abuse is its own warning and ordinary complaints stay clear", () => {
  const store = new BoundaryShieldSessionStore();
  const complaint = store.ingest(segment({
    text: "This is discriminatory and I want a refund. Your company is useless.",
    segmentId: "complaint",
    conversationId: "email-discrimination",
  }));
  const attack = store.ingest(segment({
    text: "Go back to your country!!!!",
    segmentId: "attack",
    conversationId: "email-discrimination",
    timestamp: "2026-01-01T00:00:08Z",
  }));
  assert.equal(complaint.alert, null);
  assert.equal(attack.alert?.kind, "discrimination");
  assert.equal(attack.alert?.rung, "first_warning");
  assert.equal(attack.alert?.assessment?.category, "Discriminatory abuse");
  assert.equal(attack.alert?.assessment?.managerReviewRecommended, true);
  assert.doesNotMatch(attack.alert?.script ?? "", /\b(call|ending|disconnect)\b/i);
  assert.match(attack.alert?.script ?? "", /manager should review/i);
  assert.equal(attack.alert?.actions.includes("request_supervisor_review"), true);
});

test("invisible characters and broken punctuation still match an insult", () => {
  const store = new BoundaryShieldSessionStore();
  const hidden = store.ingest(segment({
    text: "You\u2019re an id\u200Biot.",
    segmentId: "hidden",
    conversationId: "normalize-hidden",
  }));
  const spelled = store.ingest(segment({
    text: "You\u2019re an i.d.i.o.t.",
    segmentId: "spelled",
    conversationId: "normalize-spelled",
    timestamp: "2026-01-01T00:00:09Z",
  }));
  assert.equal(hidden.alert?.kind, "insult");
  assert.equal(hidden.alert?.rung, "first_warning");
  assert.equal(spelled.alert?.kind, "insult");
  assert.equal(spelled.alert?.triggeringText, "You\u2019re an i.d.i.o.t.");
});

test("a targeted insult raises a first warning and ignores agent speech", () => {
  const store = new BoundaryShieldSessionStore();
  const first = store.ingest(segment({ text: "I have been on hold for a long time.", segmentId: "1" }));
  const insult = store.ingest(segment({ text: "You're an idiot.", segmentId: "2", timestamp: "2026-01-01T00:00:10Z" }));
  const quotedByAgent = store.ingest(
    segment({
      text: "You're an idiot.",
      speaker: "agent",
      segmentId: "3",
      timestamp: "2026-01-01T00:00:12Z",
    }),
  );

  assert.equal(first.alert, null);
  assert.equal(insult.alert?.rung, "first_warning");
  assert.equal(insult.alert?.kind, "insult");
  assert.match(insult.alert?.script ?? "", /remain respectful/);
  assert.equal(quotedByAgent.ignoredSpeaker, true);
  assert.equal(quotedByAgent.alert, null);
  assert.equal(store.getState("call-1")?.rung, "first_warning");
  assert.equal(store.getState("call-1")?.hostileCount, 1);
});

test("directed harassment is not treated as ordinary frustration", () => {
  const store = new BoundaryShieldSessionStore();
  const result = store.ingest(segment({ text: "You are disgusting.", segmentId: "h1" }));
  assert.equal(result.alert?.rung, "first_warning");
  assert.equal(result.alert?.kind, "harassment");
});

test("repeated abuse advances to the final warning", () => {
  const store = new BoundaryShieldSessionStore();
  const first = store.ingest(segment({ text: "You're an idiot.", segmentId: "1" }));
  const second = store.ingest(
    segment({ text: "You're useless.", segmentId: "2", timestamp: "2026-01-01T00:00:20Z" }),
  );
  assert.equal(first.alert?.rung, "first_warning");
  assert.equal(second.alert?.rung, "final_warning");
  assert.equal(second.alert?.kind, "harassment");
  assert.match(second.alert?.script ?? "", /cannot continue the call/);
  assert.equal(store.getState("call-1")?.hostileCount, 2);
});

test("a severe threat skips to severe escalation", () => {
  const store = new BoundaryShieldSessionStore();
  const calm = store.ingest(segment({ text: "My refund is late and I am unhappy.", segmentId: "1" }));
  const threat = store.ingest(
    segment({ text: "I know where you live.", segmentId: "2", timestamp: "2026-01-01T00:00:30Z" }),
  );
  assert.equal(calm.alert, null);
  assert.equal(threat.alert?.rung, "severe_threat");
  assert.equal(threat.alert?.kind, "threat");
  assert.match(threat.alert?.script ?? "", /ending/);
});

test("a threat on a later rung still escalates immediately", () => {
  const store = new BoundaryShieldSessionStore();
  store.ingest(segment({ text: "You're an idiot.", segmentId: "1" }));
  const threat = store.ingest(
    segment({ text: "I will find you.", segmentId: "2", timestamp: "2026-01-01T00:01:00Z" }),
  );
  assert.equal(threat.alert?.rung, "severe_threat");
  assert.equal(store.getState("call-1")?.rung, "severe_threat");
});

test("duplicate segment ids and replayed timestamps do not double alert", () => {
  const store = new BoundaryShieldSessionStore();
  const original = segment({ text: "You're an idiot.", segmentId: "same" });
  const first = store.ingest(original);
  const sameId = store.ingest(original);
  const replay = store.ingest({ ...original, segmentId: "different-id" });
  assert.equal(first.duplicate, false);
  assert.ok(first.alert);
  assert.equal(sameId.duplicate, true);
  assert.equal(sameId.alert, null);
  assert.equal(replay.duplicate, true);
  assert.equal(store.getState("call-1")?.hostileCount, 1);
  assert.equal(store.getState("call-1")?.alertHistory.length, 1);
});

test("the same words at a new time count as repeated abuse", () => {
  const store = new BoundaryShieldSessionStore();
  store.ingest(segment({ text: "You're an idiot.", segmentId: "1", timestamp: "2026-01-01T00:00:00Z" }));
  const again = store.ingest(
    segment({ text: "You're an idiot.", segmentId: "2", timestamp: "2026-01-01T00:02:00Z" }),
  );
  assert.equal(again.duplicate, false);
  assert.equal(again.alert?.rung, "final_warning");
});

test("call state stays isolated", () => {
  const store = new BoundaryShieldSessionStore();
  const scenario = SYNTHETIC_CALLS.find((call) => call.id === "two-calls");
  assert.ok(scenario);
  play(store, scenario.segments);
  assert.equal(store.getState("call-a")?.rung, "first_warning");
  assert.equal(store.getState("call-b")?.rung, "clear");
  assert.equal(store.getState("call-a")?.hostileCount, 1);
  assert.equal(store.getState("call-b")?.hostileCount, 0);
});

test("acknowledge, continue, and supervisor review do not reset the ladder", () => {
  const store = new BoundaryShieldSessionStore();
  const alert = store.ingest(segment({ text: "You're an idiot." })).alert;
  assert.ok(alert);

  const acknowledged = store.acknowledge("call-1", alert.id);
  assert.equal(acknowledged?.openAlert, null);
  assert.deepEqual(acknowledged?.acknowledgedAlertIds, [alert.id]);
  assert.equal(acknowledged?.rung, "first_warning");

  store.ingest(segment({ text: "You're useless.", segmentId: "2", timestamp: "2026-01-01T00:03:00Z" }));
  const continued = store.continueCall("call-1");
  assert.equal(continued?.openAlert, null);
  assert.equal(continued?.continuedAfterAlert, true);
  assert.equal(continued?.rung, "final_warning");

  store.ingest(segment({ text: "You are disgusting.", segmentId: "3", timestamp: "2026-01-01T00:04:00Z" }));
  const review = store.requestSupervisorReview("call-1");
  assert.equal(review?.supervisorReviewRequested, true);
  assert.equal(review?.openAlert, null);
  assert.equal(review?.rung, "final_warning");
});

test("zendesk adapter accepts sidebar text and rejects talk audio claims", () => {
  const store = new BoundaryShieldSessionStore();
  assert.equal(ZENDESK_VOICE_INTEGRATION.talkAudio, "not_connected");

  const accepted = ingestZendeskSidebarEvent(store, {
    ticketId: "ticket-9",
    eventId: "comment-1",
    authorRole: "end-user",
    text: "You're an idiot.",
    createdAt: "2026-01-01T00:00:00Z",
    source: "ticket-sidebar-text",
  });
  assert.equal(accepted.accepted, true);
  if (accepted.accepted) assert.equal(accepted.ingest.alert?.rung, "first_warning");

  const audio = ingestZendeskSidebarEvent(store, {
    ticketId: "ticket-9",
    eventId: "comment-2",
    authorRole: "end-user",
    text: "I will find you.",
    createdAt: "2026-01-01T00:01:00Z",
    source: "talk-audio" as "ticket-sidebar-text",
  });
  assert.equal(audio.accepted, false);
  assert.equal(store.getState("ticket-9")?.rung, "first_warning");
});

test("synthetic scenarios match the ladder", () => {
  for (const scenario of SYNTHETIC_CALLS) {
    const store = new BoundaryShieldSessionStore();
    const alerts = play(store, scenario.segments).flatMap((result) => (result.alert ? [result.alert] : []));
    if (scenario.id === "normal-complaint") assert.equal(alerts.length, 0);
    if (scenario.id === "targeted-insult") assert.deepEqual(alerts.map((alert) => alert.rung), ["first_warning"]);
    if (scenario.id === "repeated-abuse") {
      assert.deepEqual(alerts.map((alert) => alert.rung), ["first_warning", "final_warning"]);
    }
    if (scenario.id === "harassment") assert.equal(alerts[0]?.kind, "harassment");
    if (scenario.id === "severe-threat") assert.equal(alerts.at(-1)?.rung, "severe_threat");
  }
});
