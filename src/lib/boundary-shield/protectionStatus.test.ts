import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { BoundaryShieldSessionStore } from "./engine";
import { protectionPresentation } from "./protectionStatus";

test("an open warning is not described as monitoring", () => {
  const view = protectionPresentation({
    read: "ok",
    warningCount: 1,
    openRung: "first_warning",
    unscored: false,
  });
  assert.equal(view.state, "warning");
  assert.equal(view.title, "Warning");
  assert.equal(view.history, "1 warning on record");
  assert.match(view.detail, /suggested response/);
  assert.doesNotMatch(view.detail, /No abusive customer language was found/);
});

test("a severe threat is critical and a clear later read keeps the history", () => {
  const open = protectionPresentation({
    read: "ok",
    warningCount: 1,
    openRung: "severe_threat",
    unscored: false,
  });
  const recorded = protectionPresentation({
    read: "ok",
    warningCount: 1,
    openRung: null,
    unscored: false,
  });
  assert.equal(open.state, "critical");
  assert.equal(open.title, "Critical");
  assert.equal(recorded.state, "monitoring");
  assert.equal(recorded.title, "Monitoring");
  assert.equal(recorded.history, "1 warning on record");
  assert.match(recorded.detail, /Earlier warnings stay on record/);
  assert.doesNotMatch(recorded.detail, /No abusive customer language was found/);
});

test("a clean ticket and an unscored ticket stay distinct", () => {
  const clean = protectionPresentation({ read: "ok", warningCount: 0, openRung: null, unscored: false });
  const unscored = protectionPresentation({ read: "ok", warningCount: 0, openRung: null, unscored: true });
  assert.equal(clean.title, "Monitoring");
  assert.match(clean.detail, /No abusive customer language was found/);
  assert.equal(unscored.title, "Not scored");
});

test("acknowledging an email insult leaves the warning on record", () => {
  const store = new BoundaryShieldSessionStore();
  const result = store.ingest({
    segmentId: "mail-1",
    conversationId: "email-4",
    speaker: "customer",
    text: "You're an idiot.",
    timestamp: "2026-11-10T05:00:00Z",
  });
  assert.equal(result.alert?.rung, "first_warning");
  assert.match(result.alert?.script ?? "", /remain respectful/);
  store.acknowledge("email-4", result.alert?.id);
  const open = store.getState("email-4");
  assert.equal(open?.openAlert, null);
  assert.equal(open?.alertHistory.length, 1);
  const view = protectionPresentation({
    read: "ok",
    warningCount: open?.alertHistory.length ?? 0,
    openRung: null,
    unscored: false,
  });
  assert.equal(view.title, "Monitoring");
  assert.equal(view.history, "1 warning on record");
});

test("general diagnostics do not render customer message text", () => {
  const source = fs.readFileSync("zendesk-app/src/app.ts", "utf8");
  assert.doesNotMatch(source, /createTextNode\(segment\.text\)/);
  assert.doesNotMatch(source, /segment\.text\)/);
});
