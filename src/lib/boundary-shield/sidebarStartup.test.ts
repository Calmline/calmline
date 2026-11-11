import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { BoundaryShieldSessionStore } from "./engine";
import { APP_VERSION, MONITORING_STATUS, planSidebarStartup } from "./sidebarStartup";

const POLITE_PASSWORD_RESET =
  "Hi, I need help resetting my password for my account. Thank you.";

test("zendesk mode starts monitoring and does not autoplay demo abuse", () => {
  const plan = planSidebarStartup({ zafAvailable: true });
  assert.equal(plan.host, "zendesk");
  assert.equal(plan.autoplay, false);
  assert.equal(plan.showDemoControls, false);
  assert.equal(plan.initialStatus, MONITORING_STATUS);
  assert.equal(plan.readsTicketBody, false);
  assert.equal(plan.readsLiveAudio, false);
});

test("an installed Zendesk host stays quiet even if the ZAF client is missing", () => {
  for (const hostname of ["1234.apps.zdusercontent.com", "example.zendesk.com"]) {
    const plan = planSidebarStartup({ zafAvailable: false, hostname });
    assert.equal(plan.host, "zendesk");
    assert.equal(plan.autoplay, false);
    assert.equal(plan.showDemoControls, false);
    assert.equal(plan.initialStatus, MONITORING_STATUS);
    assert.match(plan.modeLabel, new RegExp(APP_VERSION));
  }
  const local = planSidebarStartup({ zafAvailable: false, hostname: "localhost" });
  assert.equal(local.host, "demo");
  assert.equal(local.showDemoControls, true);
});

test("local demo stays separate and also starts with no warning", () => {
  const plan = planSidebarStartup({ zafAvailable: false });
  assert.equal(plan.host, "demo");
  assert.equal(plan.autoplay, false);
  assert.equal(plan.showDemoControls, true);
  assert.equal(plan.initialStatus, MONITORING_STATUS);
  assert.notEqual(plan.modeLabel, planSidebarStartup({ zafAvailable: true }).modeLabel);
});

test("a polite password-reset request is not a first warning", () => {
  const store = new BoundaryShieldSessionStore();
  const result = store.ingest({
    segmentId: "ticket-1",
    conversationId: "1",
    speaker: "customer",
    text: POLITE_PASSWORD_RESET,
    timestamp: "2026-11-09T20:00:00Z",
  });
  assert.equal(result.alert, null);
  assert.equal(result.state.rung, "clear");
  assert.equal(result.state.openAlert, null);
});

test("an explicit abusive customer line still raises the first warning", () => {
  const store = new BoundaryShieldSessionStore();
  const polite = store.ingest({
    segmentId: "ticket-1-polite",
    conversationId: "1",
    speaker: "customer",
    text: POLITE_PASSWORD_RESET,
    timestamp: "2026-11-09T20:00:00Z",
  });
  const abusive = store.ingest({
    segmentId: "ticket-1-abuse",
    conversationId: "1",
    speaker: "customer",
    text: "You're an idiot.",
    timestamp: "2026-11-09T20:01:00Z",
  });
  assert.equal(polite.alert, null);
  assert.equal(abusive.alert?.rung, "first_warning");
  assert.equal(abusive.alert?.title, "First warning");
});

test("the installed sidebar no longer autoplays the sample insult", () => {
  const source = fs.readFileSync("zendesk-app/src/app.ts", "utf8");
  const html = fs.readFileSync("zendesk-app/assets/iframe.html", "utf8");
  assert.match(source, /planSidebarStartup/);
  assert.doesNotMatch(source, /setTimeout\(\(\) => play/);
  assert.match(html, /Monitoring — no abuse detected/);
  assert.match(html, /id="demo-tools"[^>]*hidden/);
  assert.doesNotMatch(html, /First warning/);
});
