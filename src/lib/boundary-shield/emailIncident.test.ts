import assert from "node:assert/strict";
import test from "node:test";
import { emailThreatLevel } from "./emailIncident";
import { BoundaryShieldSessionStore } from "./engine";
import { normalizeForDetection } from "./engine";
import type { TranscriptSegment } from "./types";

function email(text: string, overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    segmentId: overrides.segmentId ?? "mail-1",
    conversationId: "email-4",
    speaker: "customer",
    text,
    timestamp: "2026-11-10T18:00:00Z",
    ...overrides,
  };
}

function assertEmailScript(script: string): void {
  assert.doesNotMatch(script, /\b(call|phone|ending|disconnect|line)\b/i);
  assert.match(script, /has not been sent|do not send this message automatically/i);
}

test("ambiguous email language is not a severe threat", () => {
  const store = new BoundaryShieldSessionStore();
  const phrases = [
    "You'll regret this.",
    "I will sue you and you will hear from my lawyer.",
    "This isn't over.",
    "I will kill this subscription if nobody refunds me.",
  ];
  for (let index = 0; index < phrases.length; index += 1) {
    const text = phrases[index];
    const result = store.ingest(email(text, { segmentId: `ambiguous-${index}`, timestamp: `2026-11-10T18:0${index}:00Z` }));
    assert.equal(result.alert, null, text);
  }
  assert.equal(store.getState("email-4")?.alertHistory.length ?? 0, 0);
  const normalized = normalizeForDetection("You\u2019ll regret this.").toLowerCase();
  assert.equal(emailThreatLevel(normalized), "ambiguous");
});

test("a direct email threat is severe and an intimidation is only credible", () => {
  const store = new BoundaryShieldSessionStore();
  const credible = store.ingest(email("Watch your back."));
  const severe = store.ingest(email("I will kill you.", {
    segmentId: "mail-2",
    conversationId: "email-9",
    timestamp: "2026-11-10T18:10:00Z",
  }));
  const located = store.ingest(email("I know where you live.", {
    segmentId: "mail-3",
    conversationId: "email-10",
    timestamp: "2026-11-10T18:11:00Z",
  }));
  assert.equal(credible.alert?.rung, "first_warning");
  assert.equal(credible.alert?.kind, "threat");
  assert.equal(credible.alert?.assessment?.category, "Credible threat");
  assert.equal(credible.alert?.assessment?.severityLabel, "Warning");
  assert.equal(credible.alert?.assessment?.managerReviewRecommended, true);
  assertEmailScript(credible.alert?.script ?? "");
  assert.equal(severe.alert?.rung, "severe_threat");
  assert.equal(severe.alert?.assessment?.category, "Severe threat");
  assert.equal(severe.alert?.assessment?.severityLabel, "Critical");
  assert.match(severe.alert?.assessment?.recommendedAction ?? "", /Do not reply, close, or reassign/);
  assertEmailScript(severe.alert?.script ?? "");
  assert.equal(located.alert?.assessment?.category, "Severe threat");
  assert.doesNotMatch(located.alert?.script ?? "", /\bcall\b/i);
});

test("an email insult keeps its category and does not use a call script", () => {
  const store = new BoundaryShieldSessionStore();
  const insult = store.ingest(email("You're an idiot and you'll regret this."));
  const harassment = store.ingest(email("You are disgusting.", {
    segmentId: "mail-2",
    conversationId: "email-11",
    timestamp: "2026-11-10T18:12:00Z",
  }));
  assert.equal(insult.alert?.kind, "insult");
  assert.equal(insult.alert?.assessment?.category, "Insult");
  assert.equal(insult.alert?.assessment?.severityLabel, "Warning");
  assert.equal(insult.alert?.assessment?.managerReviewRecommended, false);
  assert.match(insult.alert?.assessment?.recommendedAction ?? "", /Do not send it automatically/);
  assertEmailScript(insult.alert?.script ?? "");
  assert.equal(harassment.alert?.assessment?.category, "Harassment");
  assert.equal(harassment.alert?.assessment?.managerReviewRecommended, true);
  assertEmailScript(harassment.alert?.script ?? "");
});

test("email history remains after the incident is dismissed", () => {
  const store = new BoundaryShieldSessionStore();
  const opened = store.ingest(email("You're an idiot."));
  store.acknowledge("email-4", opened.alert?.id);
  const state = store.getState("email-4");
  assert.equal(state?.openAlert, null);
  assert.equal(state?.alertHistory.length, 1);
  assert.equal(state?.alertHistory[0]?.assessment?.category, "Insult");
  const again = store.ingest(email("You're an idiot."));
  assert.equal(again.duplicate, true);
  assert.equal(again.alert, null);
  const staff = store.ingest(email("You're an idiot.", {
    segmentId: "staff-1",
    speaker: "agent",
    timestamp: "2026-11-10T18:20:00Z",
  }));
  assert.equal(staff.ignoredSpeaker, true);
  assert.equal(staff.alert, null);
  assert.equal(store.getState("email-4")?.alertHistory.length, 1);
});

test("a phone threat still uses the call script", () => {
  const store = new BoundaryShieldSessionStore();
  const threat = store.ingest({
    segmentId: "call-1",
    conversationId: "call-1",
    speaker: "customer",
    text: "I know where you live.",
    timestamp: "2026-11-10T18:30:00Z",
  });
  assert.equal(threat.alert?.rung, "severe_threat");
  assert.equal(threat.alert?.assessment, undefined);
  assert.match(threat.alert?.script ?? "", /call is now ending/);
});
