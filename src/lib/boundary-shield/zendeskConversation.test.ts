import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { BoundaryShieldSessionStore } from "./engine";
import {
  conversationDiagnostics,
  customerSegmentFromConversationEntry,
  chatDiagnostics,
  combineTicketMessages,
  emailDiagnostics,
  formatChatDiagnostics,
  formatConversationDiagnostics,
  formatEmailDiagnostics,
  ingestZendeskConversation,
  parseTicketConversationGet,
  type ZendeskConversationEntry,
} from "./zendeskConversation";

function entry(overrides: Partial<ZendeskConversationEntry> = {}): ZendeskConversationEntry {
  return {
    author: { id: 10, role: "end-user", name: "Customer" },
    channel: { name: "web" },
    message: { content: "Hi, I need help resetting my password. Thank you.", contentType: "text/html" },
    timestamp: "2026-11-09T21:00:00Z",
    ...overrides,
  };
}

test("a normal customer complaint does not warn", () => {
  const store = new BoundaryShieldSessionStore();
  const outcome = ingestZendeskConversation(store, "1", [
    entry({
      message: {
        content: "<p>This is ridiculous. Your company is useless and I want a refund.</p>",
        contentType: "text/html",
      },
    }),
  ]);
  assert.equal(outcome.alerts.length, 0);
  assert.equal(store.getState("email-1")?.rung, "clear");
  assert.equal(store.getState("ticket-1"), null);
});

test("a customer insult, harassment, and threat use the existing ladder", () => {
  const store = new BoundaryShieldSessionStore();
  const insult = ingestZendeskConversation(store, "2", [
    entry({
      message: { content: "<p>You're an idiot.</p>", contentType: "text/html" },
      timestamp: "2026-11-09T21:01:00Z",
    }),
  ]);
  assert.equal(insult.alerts[0]?.rung, "first_warning");
  assert.equal(insult.alerts[0]?.kind, "insult");

  const harassment = ingestZendeskConversation(store, "3", [
    entry({
      channel: { name: "native_messaging" },
      message: { content: "You are disgusting.", contentType: "text/plain" },
      timestamp: "2026-11-09T21:02:00Z",
    }),
  ]);
  assert.equal(harassment.alerts[0]?.kind, "harassment");
  assert.equal(harassment.alerts[0]?.rung, "first_warning");

  const threat = ingestZendeskConversation(store, "4", [
    entry({
      channel: { name: "whatsapp" },
      message: { content: "I know where you live.", contentType: "text/plain" },
      timestamp: "2026-11-09T21:03:00Z",
    }),
  ]);
  assert.equal(threat.alerts[0]?.rung, "severe_threat");
  assert.equal(threat.alerts[0]?.kind, "threat");
});

test("agent, unknown, voice, and empty messages are not analyzed", () => {
  const store = new BoundaryShieldSessionStore();
  const outcome = ingestZendeskConversation(store, "5", [
    entry({ author: { id: 2, role: "agent" }, message: { content: "You're an idiot.", contentType: "text/html" } }),
    entry({ author: { id: 3, role: "admin" }, message: { content: "You're an idiot.", contentType: "text/html" } }),
    entry({ author: { role: "" }, message: { content: "You're an idiot.", contentType: "text/html" } }),
    entry({ author: undefined, message: { content: "You're an idiot.", contentType: "text/html" } }),
    entry({
      channel: { name: "voice" },
      message: { content: null, contentType: null },
      attachments: [{ contentType: "audio/mpeg", filename: "call.mp3" }],
    }),
    entry({ channel: { name: "internal" }, message: { content: "You're an idiot.", contentType: "text/html" } }),
    entry({ channel: { name: "chat_transcript" }, message: { content: "You're an idiot.", contentType: "text/html" } }),
    entry({ message: { content: "   ", contentType: "text/html" } }),
    entry({ timestamp: "  " }),
  ]);
  assert.equal(outcome.alerts.length, 0);
  assert.equal(store.getState("ticket-5"), null);
  assert.equal(store.getState("email-5"), null);
  assert.equal(customerSegmentFromConversationEntry(entry({ author: { role: "system" } }), "5").accepted, false);
});

test("the same Zendesk message does not warn twice", () => {
  const store = new BoundaryShieldSessionStore();
  const message = entry({
    message: { content: "You're an idiot.", contentType: "text/html" },
    timestamp: "2026-11-09T21:04:00Z",
  });
  const first = ingestZendeskConversation(store, "6", [message]);
  const second = ingestZendeskConversation(store, "6", [message]);
  assert.equal(first.alerts.length, 1);
  assert.equal(second.alerts.length, 0);
  assert.equal(store.getState("email-6")?.alertHistory.length, 1);
  assert.equal(store.getState("ticket-6"), null);
});

test("diagnostics count staff skips and hide message content", () => {
  const name = "Ky Davis";
  const insult = "You\u2019re an idiot and you have no idea how to do your job.";
  const entries = [
    entry({
      author: { id: 10, role: "end-user", name },
      message: { content: `<p>${insult}</p>`, contentType: "text/html" },
      timestamp: "2026-11-09T21:05:00Z",
    }),
    entry({
      author: { id: 2, role: "agent", name },
      message: { content: `<p>${insult}</p>`, contentType: "text/html" },
      timestamp: "2026-11-09T21:06:00Z",
    }),
    entry({
      author: { id: 3, role: "admin", name: "Support" },
      message: { content: "<p>Thanks for writing in.</p>", contentType: "text/html" },
      timestamp: "2026-11-09T21:07:00Z",
    }),
  ];
  const store = new BoundaryShieldSessionStore();
  const outcome = ingestZendeskConversation(store, "2", entries);
  const report = conversationDiagnostics(entries);
  const visible = formatConversationDiagnostics(report);
  assert.equal(outcome.alerts.length, 1);
  assert.equal(outcome.alerts[0]?.rung, "first_warning");
  assert.deepEqual(report, {
    received: true,
    entryCount: 3,
    endUserEvaluated: 1,
    agentOrAdminSkipped: 2,
    readFailed: false,
  });
  assert.equal(visible.includes(insult), false);
  assert.equal(visible.includes(name), false);
  assert.match(visible, /End-user messages evaluated: 1/);
  assert.match(visible, /Agent\/admin messages skipped: 2/);
  assert.equal(formatConversationDiagnostics({ ...report, received: false, readFailed: true }).includes("Read failed: yes"), true);
});

test("email quotes, staff replies, and chat history stay separate", () => {
  const store = new BoundaryShieldSessionStore();
  const politeWithQuote = entry({
    message: {
      content: "<div>I still need help with my refund. This is ridiculous.</div><div class=\"gmail_quote\"><blockquote>You're an idiot.</blockquote></div>",
      contentType: "text/html",
    },
    timestamp: "2026-11-09T22:00:00Z",
  });
  const quotedOnly = entry({
    message: { content: "<blockquote>You're an idiot.</blockquote>", contentType: "text/html" },
    timestamp: "2026-11-09T22:01:00Z",
  });
  const uncertain = entry({
    message: { content: "<div>You're an idiot.</div><blockquote>Earlier note", contentType: "text/html" },
    timestamp: "2026-11-09T22:02:00Z",
  });
  const agentReply = entry({
    author: { id: 2, role: "agent", name: "Ky Davis" },
    message: { content: "<p>You're an idiot.</p>", contentType: "text/html" },
    timestamp: "2026-11-09T22:03:00Z",
  });
  const emailInsult = entry({
    message: { content: "<p>You're an idiot.</p>", contentType: "text/html" },
    timestamp: "2026-11-09T22:04:00Z",
  });
  const chatInsult = entry({
    channel: { name: "native_messaging" },
    message: { content: "You are disgusting.", contentType: "text/plain" },
    timestamp: "2026-11-09T22:05:00Z",
  });
  const first = ingestZendeskConversation(store, "8", [politeWithQuote, quotedOnly, uncertain, agentReply, emailInsult]);
  const second = ingestZendeskConversation(store, "8", [emailInsult]);
  const chat = ingestZendeskConversation(store, "8", [chatInsult]);
  assert.equal(first.alerts.length, 2);
  assert.equal(first.alerts[0]?.kind, "insult");
  assert.equal(first.alerts[0]?.conversationId, "email-8");
  assert.equal(first.alerts[1]?.rung, "final_warning");
  assert.equal(second.alerts.length, 0);
  assert.equal(store.getState("email-8")?.rung, "final_warning");
  assert.equal(store.getState("email-8")?.alertHistory.length, 2);
  assert.equal(chat.alerts[0]?.conversationId, "chat-8");
  assert.equal(chat.alerts[0]?.rung, "first_warning");
  assert.equal(store.getState("chat-8")?.hostileCount, 1);
  assert.equal(store.getState("ticket-8"), null);

  const report = emailDiagnostics([politeWithQuote, quotedOnly, uncertain, agentReply, emailInsult, chatInsult]);
  const visible = formatEmailDiagnostics(report);
  assert.deepEqual(report, {
    connected: true,
    entriesReceived: 5,
    endUserRepliesEvaluated: 3,
    agentOrAdminRepliesSkipped: 1,
    readFailed: false,
  });
  assert.equal(visible.includes("You're an idiot."), false);
  assert.equal(visible.includes("Ky Davis"), false);
  assert.match(visible, /Connected: yes/);
  assert.match(visible, /End-user replies evaluated: 3/);
});

test("a real end-user email is scored when the conversation feed omits the body", () => {
  const name = "Pat Customer";
  const address = "pat.customer@example.com";
  const insult = "You're an idiot.";
  const conversation = [
    {
      author: { id: 10, role: "end_user", name },
      channel: { name: "email" },
      message: {
        content: `<div class="zd-comment" dir="auto">${insult}<br></div>`,
        contentType: "text/html; charset=utf-8",
      },
      timestamp: "2026-11-10T04:00:00Z",
    },
    {
      author: { id: 2, role: "agent", name: "Ky Davis" },
      channel: { name: "email" },
      message: { content: `<div class="zd-comment">${insult}</div>`, contentType: "text/html" },
      timestamp: "2026-11-10T04:01:00Z",
    },
  ];
  const comments = [
    {
      id: 90,
      public: true,
      via: { channel: "email" },
      author: { id: 10, role: "end-user" },
      created_at: "2026-11-10T04:02:00Z",
      value: `<div class="zd-comment" dir="auto">${insult}</div><blockquote>Earlier note`,
    },
  ];
  const entries = combineTicketMessages(conversation, comments);
  const store = new BoundaryShieldSessionStore();
  const outcome = ingestZendeskConversation(store, "4", entries);
  const report = conversationDiagnostics(entries);
  assert.equal(outcome.alerts.length, 2);
  assert.equal(outcome.alerts[0]?.kind, "insult");
  assert.equal(outcome.alerts[0]?.conversationId, "email-4");
  assert.equal(outcome.alerts[1]?.rung, "final_warning");
  assert.equal(report.endUserEvaluated, 2);
  assert.equal(report.agentOrAdminSkipped, 1);
  const visible = formatConversationDiagnostics(report);
  assert.equal(visible.includes(insult), false);
  assert.equal(visible.includes(name), false);
  assert.equal(visible.includes(address), false);
  const again = ingestZendeskConversation(store, "4", entries);
  assert.equal(again.alerts.length, 0);
});

test("saved email comments are used when conversation content is null", () => {
  const entries = combineTicketMessages(
    [
      {
        author: { id: 10, role: "end-user", name: "Pat" },
        channel: { name: "web" },
        message: { content: null, contentType: "text/html" },
        timestamp: "2026-11-10T04:03:00Z",
      },
    ],
    [
      {
        id: 91,
        public: true,
        via: { channel: "email" },
        author: { id: 10, role: "end-user" },
        created_at: "2026-11-10T04:03:00Z",
        value: "<div class=\"zd-comment\" dir=\"auto\">You're an idiot.</div>",
      },
    ],
  );
  const store = new BoundaryShieldSessionStore();
  const outcome = ingestZendeskConversation(store, "4", entries);
  assert.equal(entries.length, 1);
  assert.equal(outcome.alerts[0]?.kind, "insult");
  assert.equal(outcome.alerts[0]?.conversationId, "email-4");
});

test("a failed conversation payload is not reported as an empty success", () => {
  assert.deepEqual(parseTicketConversationGet({ "ticket.conversation": [] }), { ok: true, entries: [] });
  assert.equal(parseTicketConversationGet({ "ticket.conversation": null }).ok, false);
  assert.equal(parseTicketConversationGet({}).ok, false);
  assert.equal(parseTicketConversationGet({ "ticket.conversation": { message: "unavailable" } }).ok, false);
  assert.equal(parseTicketConversationGet("ticket").ok, false);
});

test("chat messages keep a separate history and do not mark an empty chat as connected", () => {
  const entries = [
    entry({
      message: { content: "<p>You're an idiot.</p>", contentType: "text/html" },
      timestamp: "2026-11-09T22:10:00Z",
    }),
    entry({
      channel: { name: "native_messaging" },
      message: { content: "You are disgusting.", contentType: "text/plain" },
      timestamp: "2026-11-09T22:11:00Z",
    }),
  ];
  const report = chatDiagnostics(entries);
  const visible = formatChatDiagnostics(report);
  assert.deepEqual(report, {
    entriesReceived: 1,
    endUserMessagesEvaluated: 1,
    agentOrAdminMessagesSkipped: 0,
  });
  assert.equal(visible.includes("You're an idiot"), false);
  assert.equal(chatDiagnostics([entry()]).entriesReceived, 0);
});

test("the sidebar reads ticket conversation and does not write back to Zendesk", () => {
  const source = fs.readFileSync("zendesk-app/src/app.ts", "utf8");
  const mapper = fs.readFileSync("src/lib/boundary-shield/zendeskConversation.ts", "utf8");
  assert.match(source, /ticket\.conversation/);
  assert.match(source, /ticket\.conversation\.changed/);
  assert.match(source, /ticket\.comments/);
  assert.match(source, /app\.registered/);
  assert.match(source, /parseTicketConversationGet/);
  const html = fs.readFileSync("zendesk-app/assets/iframe.html", "utf8");
  assert.match(html, /https:\/\/static\.zdassets\.com\/zendesk_app_framework_sdk\/2\.0\/zaf_sdk\.min\.js/);
  assert.doesNotMatch(source, /client\.set\(/);
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(mapper, /fetch\(/);
  assert.doesNotMatch(mapper, /XMLHttpRequest/);
});
