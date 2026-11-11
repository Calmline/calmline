import assert from "node:assert/strict";
import test from "node:test";
import { BoundaryShieldSessionStore } from "./engine";
import {
  IncidentAcknowledgementLedger,
  suppressAcknowledgedIncidents,
  type AcknowledgementStorage,
} from "./incidentAcknowledgement";
import { ingestZendeskConversation, type ZendeskConversationEntry } from "./zendeskConversation";

const INSULT = "You're an idiot.";

function memoryStorage(): AcknowledgementStorage & { saved: string } {
  return {
    saved: "",
    read() {
      return this.saved || null;
    },
    write(value: string) {
      this.saved = value;
    },
  };
}

function entry(text: string, overrides: Partial<ZendeskConversationEntry> = {}): ZendeskConversationEntry {
  return {
    author: { id: 20, role: "end-user" },
    channel: { name: "web" },
    message: { content: `<p>${text}</p>`, contentType: "text/html" },
    timestamp: "2026-11-10T18:00:00Z",
    ...overrides,
  };
}

function readTicket(entries: ZendeskConversationEntry[], ledger: IncidentAcknowledgementLedger, accountId: string, ticketId: string) {
  const session = new BoundaryShieldSessionStore();
  const outcome = ingestZendeskConversation(session, ticketId, entries);
  suppressAcknowledgedIncidents(session, ledger, accountId, ticketId);
  return { session, outcome };
}

test("refreshing a ticket does not reopen an acknowledged incident", () => {
  const storage = memoryStorage();
  const ledger = new IncidentAcknowledgementLedger(storage);
  const original = readTicket([entry(INSULT)], ledger, "acme", "4");
  const open = original.session.getState("email-4")?.openAlert;
  assert.equal(open?.assessment?.category, "Insult");
  assert.ok(open);
  const saved = ledger.remember({
    accountId: "Acme",
    ticketId: "4",
    fingerprint: open.segmentId,
    acknowledgedAt: "2026-11-10T18:05:00Z",
  });
  assert.ok(saved);
  assert.equal(storage.saved.includes(INSULT), false);
  assert.equal(storage.saved.includes("idiot"), false);

  const refreshed = readTicket([entry(INSULT)], ledger, "acme", "4");
  const state = refreshed.session.getState("email-4");
  assert.equal(refreshed.outcome.alerts.length, 1);
  assert.equal(state?.openAlert, null);
  assert.equal(state?.alertHistory.length, 1);
  assert.equal(state?.alertHistory[0]?.assessment?.category, "Insult");
  assert.equal(state?.alertHistory[0]?.assessment?.severityLabel, "Warning");
});

test("reopening a ticket keeps the history and does not reopen the warning", () => {
  const ledger = new IncidentAcknowledgementLedger(memoryStorage());
  const first = readTicket([entry(INSULT)], ledger, "acme", "4");
  const fingerprint = first.session.getState("email-4")?.openAlert?.segmentId ?? "";
  ledger.remember({
    accountId: "acme",
    ticketId: "4",
    fingerprint,
    acknowledgedAt: "2026-11-10T18:06:00Z",
  });
  const reopened = readTicket([entry(INSULT)], ledger, "acme", "4");
  const state = reopened.session.getState("email-4");
  assert.equal(state?.openAlert, null);
  assert.equal(state?.alertHistory.length, 1);
  assert.match(state?.alertHistory[0]?.script ?? "", /email conversation/);
  assert.doesNotMatch(state?.alertHistory[0]?.script ?? "", /\bcall\b/i);
});

test("a duplicate message does not create another acknowledgement or warning", () => {
  const storage = memoryStorage();
  const ledger = new IncidentAcknowledgementLedger(storage);
  const message = entry(INSULT);
  const session = new BoundaryShieldSessionStore();
  const first = ingestZendeskConversation(session, "4", [message]);
  const second = ingestZendeskConversation(session, "4", [message]);
  assert.equal(first.alerts.length, 1);
  assert.equal(second.alerts.length, 0);
  const fingerprint = first.alerts[0]?.segmentId ?? "";
  ledger.remember({
    accountId: "acme",
    ticketId: "4",
    fingerprint,
    acknowledgedAt: "2026-11-10T18:07:00Z",
  });
  ledger.remember({
    accountId: "acme",
    ticketId: "4",
    fingerprint,
    acknowledgedAt: "2026-11-10T18:08:00Z",
  });
  const parsed = JSON.parse(storage.saved) as { records: Array<{ fingerprint: string }> };
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0]?.fingerprint, fingerprint);
  assert.equal(storage.saved.includes(INSULT), false);
  assert.equal(session.getState("email-4")?.alertHistory.length, 1);
});

test("a new abusive customer email still opens a new incident", () => {
  const ledger = new IncidentAcknowledgementLedger(memoryStorage());
  const first = readTicket([entry(INSULT)], ledger, "acme", "4");
  const fingerprint = first.session.getState("email-4")?.openAlert?.segmentId ?? "";
  ledger.remember({
    accountId: "acme",
    ticketId: "4",
    fingerprint,
    acknowledgedAt: "2026-11-10T18:09:00Z",
  });
  const next = readTicket([
    entry(INSULT),
    entry("You are disgusting.", { timestamp: "2026-11-10T18:15:00Z" }),
  ], ledger, "acme", "4");
  const state = next.session.getState("email-4");
  assert.equal(state?.alertHistory.length, 2);
  assert.equal(state?.openAlert?.assessment?.category, "Harassment");
  assert.equal(state?.openAlert?.segmentId === fingerprint, false);
  assert.equal(ledger.has("acme", "4", state?.openAlert?.segmentId ?? ""), false);
});

test("agent replies are not acknowledged as customer incidents", () => {
  const storage = memoryStorage();
  const ledger = new IncidentAcknowledgementLedger(storage);
  const session = new BoundaryShieldSessionStore();
  const outcome = ingestZendeskConversation(session, "4", [
    entry(INSULT, { author: { id: 2, role: "agent" } }),
    entry(INSULT, { author: { id: 3, role: "admin" }, timestamp: "2026-11-10T18:16:00Z" }),
  ]);
  assert.equal(outcome.alerts.length, 0);
  suppressAcknowledgedIncidents(session, ledger, "acme", "4");
  assert.equal(session.getState("email-4")?.alertHistory.length ?? 0, 0);
  assert.equal(storage.saved, "");
  const rejected = ledger.remember({
    accountId: "acme",
    ticketId: "4",
    fingerprint: INSULT,
    acknowledgedAt: "2026-11-10T18:17:00Z",
  });
  assert.equal(rejected, null);
  assert.equal(storage.saved.includes(INSULT), false);
});

test("an acknowledgement on one Zendesk account does not hide another account", () => {
  const ledger = new IncidentAcknowledgementLedger(memoryStorage());
  const first = readTicket([entry(INSULT)], ledger, "acme", "4");
  const fingerprint = first.session.getState("email-4")?.openAlert?.segmentId ?? "";
  ledger.remember({
    accountId: "acme",
    ticketId: "4",
    fingerprint,
    acknowledgedAt: "2026-11-10T18:18:00Z",
  });
  const otherAccount = readTicket([entry(INSULT)], ledger, "other", "4");
  assert.equal(otherAccount.session.getState("email-4")?.openAlert?.kind, "insult");
  const otherTicket = readTicket([entry(INSULT)], ledger, "acme", "8");
  assert.equal(otherTicket.session.getState("email-8")?.openAlert?.kind, "insult");
});
