import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("zendesk app manifest is a Support ticket sidebar app", () => {
  const manifest = JSON.parse(fs.readFileSync("zendesk-app/manifest.json", "utf8")) as {
    frameworkVersion: string;
    version: string;
    location: { support: { ticket_sidebar: { url: string; flexible?: boolean } } };
    defaultLocale: string;
  };
  assert.equal(manifest.frameworkVersion, "2.0");
  assert.equal(manifest.version, "0.1.9");
  assert.equal(manifest.location.support.ticket_sidebar.url, "assets/iframe.html");
  assert.equal(manifest.location.support.ticket_sidebar.flexible, true);
  assert.equal(manifest.defaultLocale, "en");
  assert.equal(fs.existsSync("zendesk-app/translations/en.json"), true);
});

test("sidebar shell has an accessible warning dialog and no microphone access", () => {
  const html = fs.readFileSync("zendesk-app/assets/iframe.html", "utf8");
  const css = fs.readFileSync("zendesk-app/assets/sidebar.css", "utf8");
  const js = fs.readFileSync("zendesk-app/assets/sidebar-0.1.9.js", "utf8");
  assert.match(html, /role="alertdialog"/);
  assert.match(html, /sidebar-0\.1\.9\.js/);
  assert.match(html, /Boundary Shield 0\.1\.9/);
  assert.match(html, /aria-label="Read diagnostics"/);
  assert.match(html, /zaf_sdk\.min\.js/);
  assert.match(html, /data-state="not-connected"/);
  assert.match(html, /aria-label="Conversation diagnostics"/);
  assert.match(html, /aria-label="Email diagnostics"/);
  assert.match(js, /End-user replies evaluated/);
  assert.match(js, /End-user messages evaluated/);
  assert.match(js, /Agent\/admin messages skipped/);
  assert.doesNotMatch(js, /client\.set\(/);
  assert.match(html, /Monitoring — no abuse detected/);
  assert.match(js, /Monitoring (?:—|\\u2014) no abuse detected/);
  assert.match(js, /Live call audio is not connected/);
  assert.doesNotMatch(js, /setTimeout\(\(\) => play/);
  assert.doesNotMatch(js, /getUserMedia/);
  assert.doesNotMatch(html, /getUserMedia/);
  assert.equal(css.length > 0, true);
});
