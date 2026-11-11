import { ingestForChannel } from "../../src/lib/boundary-shield/channels";
import { BoundaryShieldSessionStore } from "../../src/lib/boundary-shield/engine";
import {
  IncidentAcknowledgementLedger,
  suppressAcknowledgedIncidents,
} from "../../src/lib/boundary-shield/incidentAcknowledgement";
import { protectionPresentation } from "../../src/lib/boundary-shield/protectionStatus";
import { APP_VERSION, MONITORING_STATUS, planSidebarStartup } from "../../src/lib/boundary-shield/sidebarStartup";
import { SYNTHETIC_CALLS, scenarioById, scopeSegments } from "../../src/lib/boundary-shield/syntheticCalls";
import type { BoundaryShieldAlert, TranscriptSegment } from "../../src/lib/boundary-shield/types";
import {
  chatDiagnostics,
  combineTicketMessages,
  conversationDiagnostics,
  emailDiagnostics,
  formatChatDiagnostics,
  formatConversationDiagnostics,
  formatEmailDiagnostics,
  ingestZendeskConversation,
  parseTicketCommentsGet,
  parseTicketConversationGet,
  type ChatDiagnostics,
  type ConversationDiagnostics,
  type EmailDiagnostics,
  type ZendeskConversationEntry,
} from "../../src/lib/boundary-shield/zendeskConversation";

type ZafClient = {
  invoke: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
  get: (path: string) => Promise<Record<string, unknown>>;
  on: (event: string, handler: () => void) => void;
};

declare global {
  interface Window {
    ZAFClient?: { init: () => ZafClient };
  }
}

const STEP_MS = 700;
const DEMO_SCENARIO = "normal-complaint";

let zendeskAccountId = "";
let zendeskTicketId = "";
const incidentLedger = new IncidentAcknowledgementLedger({
  read: () => {
    try {
      return window.localStorage.getItem("calmline-boundary-shield-acknowledgements");
    } catch {
      return null;
    }
  },
  write: (value) => {
    try {
      window.localStorage.setItem("calmline-boundary-shield-acknowledgements", value);
    } catch {
      // A blocked browser store must not stop the ticket from being read.
    }
  },
});

function rememberCurrentIncident(): void {
  if (hostMode !== "zendesk" || !currentAlert || !zendeskAccountId || !zendeskTicketId) return;
  incidentLedger.remember({
    accountId: zendeskAccountId,
    ticketId: zendeskTicketId,
    fingerprint: currentAlert.segmentId,
    acknowledgedAt: new Date().toISOString(),
  });
}
let store = new BoundaryShieldSessionStore();
let segments: TranscriptSegment[] = [];
let index = 0;
let timer = 0;
let scope = "demo";
let currentAlert: BoundaryShieldAlert | null = null;
let hostMode: "zendesk" | "demo" = "demo";
let lastRead: "waiting" | "ok" | "failed" = "waiting";
let lastEmail = emailDiagnostics([]);
let lastChat = chatDiagnostics([]);
let lastReadout = { read: "waiting", entries: 0, evaluated: 0, staff: 0, error: "none" };

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

function setStatus(text: string): void {
  byId("status").textContent = text;
}

function warningCount(): number {
  return store.listStates().reduce((sum, state) => sum + state.alertHistory.length, 0);
}

function warningsFor(prefix: string): number {
  return store.listStates()
    .filter((state) => state.conversationId.startsWith(prefix))
    .reduce((sum, state) => sum + state.alertHistory.length, 0);
}

function syncOpenAlert(): void {
  const open = store.listStates().flatMap((state) => (state.openAlert ? [state.openAlert] : []));
  currentAlert = open.length > 0 ? open[open.length - 1] : null;
}

function renderFramework(ready: boolean, attempted: boolean, error: string): void {
  byId("framework-status").textContent = [
    `Framework ready: ${ready ? "yes" : "no"}`,
    `Read attempted: ${attempted ? "yes" : "no"}`,
    `Read error: ${error}`,
  ].join("\n");
}

function renderReadout(): void {
  const other = Math.max(0, lastReadout.entries - lastReadout.evaluated - lastReadout.staff);
  byId("readout").textContent = [
    `Read: ${lastReadout.read}`,
    `Entries received: ${lastReadout.entries}`,
    `End-user evaluated: ${lastReadout.evaluated}`,
    `Staff skipped: ${lastReadout.staff}`,
    `Other skipped: ${other}`,
    `Error: ${lastReadout.error}`,
  ].join("\n");
}

function renderProtection(): void {
  syncOpenAlert();
  const recorded = warningCount();
  const unscored = lastRead === "ok" && lastReadout.evaluated === 0 && lastReadout.entries > lastReadout.evaluated + lastReadout.staff;
  const view = protectionPresentation({
    read: lastRead === "ok" ? "ok" : lastRead === "failed" ? "failed" : "waiting",
    warningCount: recorded,
    openRung: currentAlert?.rung ?? null,
    unscored,
  });
  const card = byId("state-card");
  card.dataset.state = view.state;
  byId("state-title").textContent = view.title;
  byId("state-detail").textContent = view.detail;
  byId("history-note").textContent = recorded > 0 ? view.history : "";
  byId("count-evaluated").textContent = String(lastReadout.evaluated);
  byId("count-warnings").textContent = String(recorded);
  const response = byId("response");
  if (currentAlert) {
    response.hidden = false;
    byId("response-script").textContent = currentAlert.script;
  } else {
    response.hidden = true;
    byId("response-script").textContent = "";
  }
  renderIncidentFacts("card", currentAlert);
  renderIncidentHistory();
  renderReadout();
  byId("channel-voice").textContent = hostMode === "demo" ? "Simulator" : "Not connected";
  const emailOpen = currentAlert?.conversationId.startsWith("email-") ?? false;
  const chatOpen = currentAlert?.conversationId.startsWith("chat-") ?? false;
  const alertLabel = currentAlert?.rung === "severe_threat" ? "Critical" : "Warning";
  if (lastRead !== "ok") {
    byId("channel-email").textContent = lastRead === "failed" ? "Read failed" : "Not connected";
    byId("channel-chat").textContent = "Not connected";
  } else {
    byId("channel-email").textContent = emailOpen ? alertLabel : warningsFor("email-") > 0 ? "On record" : "Monitoring";
    byId("channel-chat").textContent = chatOpen
      ? alertLabel
      : warningsFor("chat-") > 0 ? "On record" : lastChat.entriesReceived > 0 ? "Receiving" : "Not connected";
  }
}

const DIAGNOSTICS_WAITING: ConversationDiagnostics = {
  received: false,
  entryCount: 0,
  endUserEvaluated: 0,
  agentOrAdminSkipped: 0,
  readFailed: false,
};

function renderDiagnostics(report: ConversationDiagnostics): void {
  byId("diagnostics-text").textContent = formatConversationDiagnostics(report);
}

const EMAIL_DIAGNOSTICS_WAITING: EmailDiagnostics = {
  connected: false,
  entriesReceived: 0,
  endUserRepliesEvaluated: 0,
  agentOrAdminRepliesSkipped: 0,
  readFailed: false,
};

function renderEmailDiagnostics(report: EmailDiagnostics): void {
  lastEmail = report;
  byId("email-diagnostics-text").textContent = formatEmailDiagnostics(report);
}

const CHAT_DIAGNOSTICS_EMPTY: ChatDiagnostics = {
  entriesReceived: 0,
  endUserMessagesEvaluated: 0,
  agentOrAdminMessagesSkipped: 0,
};

function renderChatDiagnostics(report: ChatDiagnostics): void {
  lastChat = report;
  byId("chat-diagnostics-text").textContent = formatChatDiagnostics(report);
}

function renderIncidentFacts(prefix: "card" | "dialog", alert: BoundaryShieldAlert | null): void {
  const facts = alert?.assessment;
  const box = byId(`${prefix}-facts`);
  box.hidden = !facts;
  if (!facts) return;
  byId(`${prefix}-category`).textContent = facts.category;
  byId(`${prefix}-severity`).textContent = facts.severityLabel;
  byId(`${prefix}-action`).textContent = facts.recommendedAction;
  byId(`${prefix}-review`).textContent = facts.managerReviewRecommended ? "Recommended" : "Not required";
}

function renderIncidentHistory(): void {
  const list = byId<HTMLOListElement>("incident-list");
  list.replaceChildren();
  const recorded = store.listStates().flatMap((state) => state.alertHistory);
  byId("incident-history").hidden = recorded.length === 0;
  for (const alert of recorded) {
    const item = document.createElement("li");
    const facts = alert.assessment;
    item.textContent = facts
      ? `${facts.category} · ${facts.severityLabel} · Manager review ${facts.managerReviewRecommended ? "recommended" : "not required"}`
      : alert.title;
    list.append(item);
  }
}

function renderTranscript(): void {
  const list = byId<HTMLOListElement>("transcript");
  list.replaceChildren();
}

function hideAlert(): void {
  currentAlert = null;
  byId("popup").hidden = true;
  renderProtection();
}

function showAlert(alert: BoundaryShieldAlert): void {
  currentAlert = alert;
  const email = alert.conversationId.startsWith("email-");
  byId("warning-title").textContent = alert.assessment?.category ?? alert.title;
  byId("warning-quote").textContent = `“${alert.triggeringText}”`;
  byId("warning-script").textContent = alert.script;
  renderIncidentFacts("dialog", alert);
  byId("warning-description").textContent = email
    ? alert.rung === "severe_threat"
      ? "A severe threat was detected in this email. Manager review is recommended. Nothing is sent, closed, or reassigned."
      : "Abusive customer email was detected. Review the category and suggested reply. Nothing is sent, closed, or reassigned."
    : alert.rung === "severe_threat"
      ? "A severe threat was detected. Read the suggested script, then choose one option. The conversation is not ended automatically."
      : "Abusive customer language was detected. Read the suggested script, then choose one option. Nothing is sent automatically.";
  const popup = byId("popup");
  popup.hidden = false;
  byId<HTMLDivElement>("dialog").focus();
  renderProtection();
  setStatus(`${alert.title}. Choose an option in the warning.`);
}

function stopTimer(): void {
  window.clearTimeout(timer);
}

function tick(): void {
  if (index >= segments.length) {
    setStatus("Simulated call finished. Live call audio is not connected.");
    return;
  }
  const result = ingestForChannel(store, "demo", { segment: segments[index] });
  index += 1;
  renderTranscript();
  if (result.accepted && result.ingest.alert) {
    showAlert(result.ingest.alert);
    return;
  }
  timer = window.setTimeout(tick, STEP_MS);
}

function currentPlan() {
  return planSidebarStartup({
    zafAvailable: readZafClient() !== undefined,
    hostname: window.location.hostname,
  });
}

function play(scenarioId: string): void {
  if (!currentPlan().showDemoControls) return;
  const scenario = scenarioById(scenarioId);
  if (!scenario) return;
  stopTimer();
  store = new BoundaryShieldSessionStore();
  hideAlert();
  segments = scopeSegments(scenario.segments, scope);
  index = 0;
  renderTranscript();
  setStatus("Simulated transcript events are arriving.");
  tick();
}

function resumeAfterAction(): void {
  hideAlert();
  renderTranscript();
  if (index >= segments.length) {
    setStatus("Simulated call finished. Live call audio is not connected.");
    return;
  }
  timer = window.setTimeout(tick, STEP_MS);
}

function bind(): void {
  const select = byId<HTMLSelectElement>("scenario");
  for (const scenario of SYNTHETIC_CALLS) {
    const option = document.createElement("option");
    option.value = scenario.id;
    option.textContent = scenario.title;
    select.append(option);
  }
  select.value = DEMO_SCENARIO;
  byId("play").addEventListener("click", () => play(select.value));
  byId("reset").addEventListener("click", () => {
    stopTimer();
    store = new BoundaryShieldSessionStore();
    hideAlert();
    segments = [];
    index = 0;
    renderTranscript();
    renderProtection();
  });
  byId("acknowledge").addEventListener("click", () => {
    if (!currentAlert) return;
    store.acknowledge(currentAlert.conversationId, currentAlert.id);
    rememberCurrentIncident();
    const finished = hostMode === "demo" && index >= segments.length;
    resumeAfterAction();
    if (!finished) setStatus("Acknowledged. The warning ladder stays where it is.");
  });
  byId("continue").addEventListener("click", () => {
    if (!currentAlert) return;
    store.continueCall(currentAlert.conversationId);
    rememberCurrentIncident();
    const finished = hostMode === "demo" && index >= segments.length;
    resumeAfterAction();
    if (!finished) setStatus("Call continues. Another abusive line can still raise the next warning.");
  });
  byId("review").addEventListener("click", () => {
    if (!currentAlert) return;
    store.requestSupervisorReview(currentAlert.conversationId);
    rememberCurrentIncident();
    stopTimer();
    hideAlert();
    renderTranscript();
    setStatus("Supervisor review requested. Nothing was sent to Zendesk.");
  });
  byId("dialog").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

function readZendeskAccount(client: ZafClient): Promise<string> {
  return client.get("currentAccount.subdomain").then((data) => {
    const value = data["currentAccount.subdomain"];
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }).catch(() => "");
}

function readZafClient(): Window["ZAFClient"] | undefined {
  const candidate = window.ZAFClient;
  if (candidate && typeof candidate.init === "function") return candidate;
  return undefined;
}

function waitForZafClient(timeoutMs = 15000): Promise<Window["ZAFClient"] | undefined> {
  const existing = readZafClient();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const found = readZafClient();
      if (found || Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(found);
      }
    }, 50);
  });
}

function applyPlan(zafAvailable: boolean): void {
  const plan = planSidebarStartup({ zafAvailable, hostname: window.location.hostname });
  byId("mode").textContent = plan.modeLabel;
  byId("banner").textContent = plan.banner;
  hostMode = plan.host;
  byId("demo-tools").hidden = !plan.showDemoControls;
  renderProtection();
}

let readingMessages = false;
let readAgain = false;

function markReadFailed(error: string): void {
  lastRead = "failed";
  lastReadout = { read: "failed", entries: 0, evaluated: 0, staff: 0, error };
  renderFramework(true, true, error);
  renderDiagnostics({ ...DIAGNOSTICS_WAITING, readFailed: true });
  renderEmailDiagnostics({ ...EMAIL_DIAGNOSTICS_WAITING, readFailed: true });
  renderChatDiagnostics(CHAT_DIAGNOSTICS_EMPTY);
  renderProtection();
}

async function loadTicketMessages(client: ZafClient, ticketId: string): Promise<void> {
  if (readingMessages) {
    readAgain = true;
    return;
  }
  readingMessages = true;
  try {
    let conversationError = "none";
    let conversationEntries: ZendeskConversationEntry[] = [];
    try {
      const parsed = parseTicketConversationGet(await client.get("ticket.conversation"));
      if (parsed.ok) conversationEntries = parsed.entries;
      else conversationError = parsed.reason;
    } catch {
      conversationError = "read-failed";
    }
    let commentsError = "none";
    let comments: Parameters<typeof combineTicketMessages>[1] = [];
    try {
      const parsed = parseTicketCommentsGet(await client.get("ticket.comments"));
      if (parsed.ok) comments = parsed.comments;
      else commentsError = parsed.reason;
    } catch {
      commentsError = "read-failed";
    }
    if (conversationError !== "none" && commentsError !== "none") {
      markReadFailed(conversationError);
      return;
    }
    const entries = combineTicketMessages(conversationEntries, comments);
    const outcome = ingestZendeskConversation(store, ticketId, entries);
    const report = conversationDiagnostics(entries);
    lastRead = "ok";
    lastReadout = {
      read: "succeeded",
      entries: report.entryCount,
      evaluated: report.endUserEvaluated,
      staff: report.agentOrAdminSkipped,
      error: conversationError !== "none" ? conversationError : commentsError,
    };
    renderFramework(true, true, lastReadout.error);
    renderDiagnostics(conversationDiagnostics(entries));
    renderEmailDiagnostics(emailDiagnostics(entries));
    renderChatDiagnostics(chatDiagnostics(entries));
    renderTranscript();
    suppressAcknowledgedIncidents(store, incidentLedger, zendeskAccountId, ticketId);
    syncOpenAlert();
    if (currentAlert) showAlert(currentAlert);
    else {
      renderProtection();
      if (warningCount() === 0 && (lastReadout.evaluated > 0 || lastReadout.entries === 0)) setStatus(MONITORING_STATUS);
    }
  } catch {
    markReadFailed("read-failed");
  } finally {
    readingMessages = false;
    if (readAgain) {
      readAgain = false;
      void loadTicketMessages(client, ticketId);
    }
  }
}

async function connectZendesk(): Promise<void> {
  store = new BoundaryShieldSessionStore();
  hideAlert();
  segments = [];
  index = 0;
  lastRead = "waiting";
  lastReadout = { read: "waiting", entries: 0, evaluated: 0, staff: 0, error: "none" };
  renderTranscript();
  renderDiagnostics(DIAGNOSTICS_WAITING);
  renderEmailDiagnostics(EMAIL_DIAGNOSTICS_WAITING);
  renderChatDiagnostics(CHAT_DIAGNOSTICS_EMPTY);
  renderFramework(false, false, "none");
  renderProtection();

  const zaf = await waitForZafClient();
  applyPlan(Boolean(zaf));
  if (!zaf) {
    renderFramework(false, false, "framework-missing");
    renderProtection();
    return;
  }

  const client = zaf.init();
  let sawRegistered = false;
  const readTicket = async () => {
    try {
      await client.invoke("resize", { width: "100%", height: "760px" });
    } catch {
      // Resizing the iframe must not prevent the conversation read.
    }
    let ticketId = "";
    try {
      const data = await client.get("ticket.id");
      const value = data["ticket.id"];
      if (typeof value === "number" || typeof value === "string") {
        ticketId = String(value);
        scope = `ticket-${ticketId}`;
        byId("mode").textContent = `Ticket ${ticketId} · Boundary Shield ${APP_VERSION}`;
      }
    } catch {
      byId("mode").textContent = `Boundary Shield ${APP_VERSION}`;
    }
    if (!ticketId) {
      markReadFailed("ticket-missing");
      return;
    }
    zendeskTicketId = ticketId;
    if (!zendeskAccountId) zendeskAccountId = await readZendeskAccount(client);
    await loadTicketMessages(client, ticketId);
  };

  if (typeof client.on === "function") {
    client.on("app.registered", () => {
      sawRegistered = true;
      void readTicket();
    });
    client.on("app.activated", () => {
      void readTicket();
    });
    client.on("ticket.conversation.changed", () => {
      void readTicket();
    });
    client.on("ticket.comments.changed", () => {
      void readTicket();
    });
  }
  window.setTimeout(() => {
    if (!sawRegistered) void readTicket();
  }, 1500);
}

bind();
void connectZendesk();
