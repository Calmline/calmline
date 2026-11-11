import assert from "node:assert/strict";
import test from "node:test";
import { BoundaryShieldSessionStore } from "./engine";
import {
  TRANSCRIPT_CHANNELS,
  classifySupportConversationEntry,
  ingestForChannel,
} from "./channels";
import { scenarioById, scopeSegments } from "./syntheticCalls";
import type { TranscriptSegment } from "./types";

function threatSegment(): TranscriptSegment {
  return {
    segmentId: "threat-1",
    conversationId: "should-not-change",
    speaker: "customer",
    text: "I know where you live.",
    timestamp: "2026-01-01T00:00:00Z",
  };
}

test("demo events reuse the warning ladder and raise a popup alert", () => {
  const store = new BoundaryShieldSessionStore();
  const scenario = scenarioById("targeted-insult");
  assert.ok(scenario);
  const alerts = scopeSegments(scenario.segments, "demo-ticket").flatMap((segment) => {
    const result = ingestForChannel(store, "demo", { segment });
    assert.equal(result.accepted, true);
    return result.accepted && result.ingest.alert ? [result.ingest.alert] : [];
  });
  assert.deepEqual(alerts.map((alert) => alert.rung), ["first_warning"]);
  assert.match(alerts[0].script, /remain respectful/);
});

test("repeated demo abuse still reaches the final warning", () => {
  const store = new BoundaryShieldSessionStore();
  const scenario = scenarioById("repeated-abuse");
  assert.ok(scenario);
  const rungs = scopeSegments(scenario.segments, "demo-repeat").flatMap((segment) => {
    const result = ingestForChannel(store, "demo", { segment });
    return result.accepted && result.ingest.alert ? [result.ingest.alert.rung] : [];
  });
  assert.deepEqual(rungs, ["first_warning", "final_warning"]);
});

test("talk and chat channels refuse events and do not change call state", () => {
  const store = new BoundaryShieldSessionStore();
  store.ingest({
    segmentId: "kept",
    conversationId: "call-1",
    speaker: "customer",
    text: "You're an idiot.",
    timestamp: "2026-01-01T00:00:00Z",
  });

  for (const channelId of ["zendesk-talk", "zendesk-chat"] as const) {
    const result = ingestForChannel(store, channelId, { segment: threatSegment() });
    assert.equal(result.accepted, false);
    assert.equal(TRANSCRIPT_CHANNELS[channelId].liveAudio, false);
    assert.equal(TRANSCRIPT_CHANNELS[channelId].status, "not_connected");
  }

  assert.equal(store.getState("call-1")?.rung, "first_warning");
  assert.equal(store.getState("should-not-change"), null);
});

test("sidebar text still works and voice conversation rows are not live transcripts", () => {
  const store = new BoundaryShieldSessionStore();
  const accepted = ingestForChannel(store, "zendesk-ticket-sidebar", {
    sidebarEvent: {
      ticketId: "ticket-4",
      eventId: "event-1",
      authorRole: "end-user",
      text: "You're an idiot.",
      createdAt: "2026-01-01T00:00:00Z",
      source: "ticket-sidebar-text",
    },
  });
  assert.equal(accepted.accepted, true);
  if (accepted.accepted) assert.equal(accepted.ingest.alert?.rung, "first_warning");

  const voice = classifySupportConversationEntry({
    channelName: "voice",
    content: null,
  });
  assert.equal(voice.usableAsLiveTranscript, false);
  assert.match(voice.reason, /not live audio/);

  const chat = classifySupportConversationEntry({
    channelName: "native_messaging",
    content: "hello",
  });
  assert.equal(chat.usableAsLiveTranscript, false);
  assert.match(chat.reason, /not connected/);
});
