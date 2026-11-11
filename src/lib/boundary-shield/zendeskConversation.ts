import type { BoundaryShieldSessionStore } from "./engine";
import type { BoundaryShieldAlert, TranscriptSegment } from "./types";

/**
 * Fields from the Zendesk Apps Framework ticket sidebar API:
 * client.get('ticket.conversation') and the ticket.conversation.changed event.
 * https://developer.zendesk.com/api-reference/apps/apps-support-api/ticket_sidebar/
 *
 * Official author roles are system, trigger, agent, admin, and end-user.
 * Only end-user is a confirmed customer.
 */
export type ZendeskConversationEntry = {
  attachments?: Array<{ contentType?: string; contentUrl?: string; filename?: string }>;
  author?: { id?: number | null; avatar?: string; name?: string; role?: string };
  channel?: { name?: string };
  message?: { content?: string | null; contentType?: string | null };
  timestamp?: string;
};

export type ConversationSkipReason =
  | "uncertain-sender"
  | "not-customer"
  | "non-text-channel"
  | "empty"
  | "missing-timestamp"
  | "uncertain-quote";

const CONFIRMED_CUSTOMER_ROLE = "end-user";
const EMAIL_CHANNELS = new Set(["web", "email", "mail"]);
const MESSAGING_CHANNELS = new Set([
  "chat",
  "native_messaging",
  "line",
  "wechat",
  "sunshine_conversations_twitter_dm",
  "sunshine_conversations_facebook_messenger",
  "instagram_dm",
  "whatsapp",
]);

export function emailConversationId(ticketId: string): string {
  return `email-${ticketId}`;
}

export function chatConversationId(ticketId: string): string {
  return `chat-${ticketId}`;
}

export function supportConversationId(channel: string, ticketId: string): string {
  if (EMAIL_CHANNELS.has(channel)) return emailConversationId(ticketId);
  if (MESSAGING_CHANNELS.has(channel)) return chatConversationId(ticketId);
  return `ticket-${ticketId}`;
}

/** Official conversation roles use end-user. Some payloads use end_user. */
export function canonicalRole(role: string | undefined | null): string {
  return (role ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
}

/**
 * ticket.conversation names inbound email "web".
 * ticket.comments names the same mail "email". Both are customer email, not staff.
 */
export function canonicalChannel(name: string | undefined | null): string {
  const value = (name ?? "").trim().toLowerCase();
  if (value === "email" || value === "mail") return "web";
  return value;
}

export function canonicalContentType(value: string | undefined | null): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw.startsWith("text/html")) return "text/html";
  if (raw.startsWith("text/plain")) return "text/plain";
  return raw;
}

export function parseTicketConversationGet(data: unknown):
  | { ok: true; entries: ZendeskConversationEntry[] }
  | { ok: false; reason: "missing" | "unexpected-shape" | "empty-payload" } {
  if (!data || typeof data !== "object") return { ok: false, reason: "unexpected-shape" };
  const record = data as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, "ticket.conversation")) {
    return { ok: false, reason: "missing" };
  }
  const value = record["ticket.conversation"];
  if (value == null) return { ok: false, reason: "empty-payload" };
  if (!Array.isArray(value)) return { ok: false, reason: "unexpected-shape" };
  return { ok: true, entries: value.map(normalizeConversationEntry) };
}

export type ZendeskComment = {
  id?: number | string;
  value?: string | null;
  body?: string | null;
  html_body?: string | null;
  plain_body?: string | null;
  public?: boolean;
  created_at?: string;
  timestamp?: string;
  author?: { id?: number | null; role?: string };
  via?: { channel?: string };
};

export function parseTicketCommentsGet(data: unknown):
  | { ok: true; comments: ZendeskComment[] }
  | { ok: false; reason: "missing" | "unexpected-shape" | "empty-payload" } {
  if (!data || typeof data !== "object") return { ok: false, reason: "unexpected-shape" };
  const record = data as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, "ticket.comments")) return { ok: false, reason: "missing" };
  const value = record["ticket.comments"];
  if (value == null) return { ok: false, reason: "empty-payload" };
  if (!Array.isArray(value)) return { ok: false, reason: "unexpected-shape" };
  return { ok: true, comments: value as ZendeskComment[] };
}

export function normalizeConversationEntry(entry: ZendeskConversationEntry): ZendeskConversationEntry {
  const contentType = canonicalContentType(entry.message?.contentType);
  return {
    ...entry,
    author: entry.author ? { ...entry.author, role: canonicalRole(entry.author.role) } : entry.author,
    channel: { name: canonicalChannel(entry.channel?.name) },
    message: entry.message ? { ...entry.message, contentType } : entry.message,
  };
}

function commentText(comment: ZendeskComment): string | null {
  const html = comment.html_body ?? comment.value ?? comment.body;
  if (typeof html === "string" && html.trim()) return html;
  if (typeof comment.plain_body === "string" && comment.plain_body.trim()) return comment.plain_body;
  return null;
}

export function commentToConversationEntry(comment: ZendeskComment): ZendeskConversationEntry | null {
  if (comment.public === false) return null;
  const channel = canonicalChannel(comment.via?.channel);
  if (!channel) return null;
  const text = commentText(comment);
  const timestamp = comment.timestamp?.trim() || comment.created_at?.trim() || "";
  return normalizeConversationEntry({
    author: { id: comment.author?.id, role: comment.author?.role },
    channel: { name: channel },
    message: {
      content: text,
      contentType: text && /<[a-z!/]/i.test(text) ? "text/html" : "text/plain",
    },
    timestamp,
  });
}

/** Prefer conversation rows that already have text. Add saved comments the conversation feed omitted. */
export function combineTicketMessages(
  conversation: ZendeskConversationEntry[],
  comments: ZendeskComment[],
): ZendeskConversationEntry[] {
  const normalized = conversation.map(normalizeConversationEntry);
  const withText = normalized.filter((entry) => typeof entry.message?.content === "string" && entry.message.content.trim());
  const seen = new Set(withText.map((entry) => entry.timestamp?.trim() ?? ""));
  const extras = comments
    .map(commentToConversationEntry)
    .filter((entry): entry is ZendeskConversationEntry => entry !== null)
    .filter((entry) => {
      const stamp = entry.timestamp?.trim() ?? "";
      return Boolean(entry.message?.content?.trim()) && !seen.has(stamp);
    });
  return [...withText, ...extras];
}

/** Channels whose message.content is text. Voice, internal notes, and combined chat transcripts are excluded. */
const TEXT_CHANNELS = new Set([
  "web",
  "api",
  "any_channel",
  "twitter",
  "facebook",
  "chat",
  "native_messaging",
  "line",
  "wechat",
  "sunshine_conversations_twitter_dm",
  "sunshine_conversations_facebook_messenger",
  "instagram_dm",
  "whatsapp",
]);

const HTML_CHANNELS = new Set(["web", "api", "any_channel", "twitter", "facebook"]);

export type ConversationDecision =
  | { accepted: true; segment: TranscriptSegment }
  | { accepted: false; reason: ConversationSkipReason };

function htmlToText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x2019;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const QUOTE_CLASS = /(?:^|\s)(?:gmail_quote|gmail_extra|zendesk_quoted|moz-cite-prefix)(?:\s|$)/i;
const OUTLOOK_QUOTE_ID = /^(?:divrplyfwdmsg|appendonsend)$/i;

function attributeValue(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[2] ?? match?.[3] ?? match?.[4] ?? "";
}

function isQuoteTag(name: string, attrs: string): boolean {
  if (name === "blockquote") return true;
  if (QUOTE_CLASS.test(attributeValue(attrs, "class"))) return true;
  return OUTLOOK_QUOTE_ID.test(attributeValue(attrs, "id"));
}

function isOutlookCut(name: string, attrs: string): boolean {
  return OUTLOOK_QUOTE_ID.test(attributeValue(attrs, "id"));
}

/**
 * Removes quoted history from an HTML email.
 * An unclosed quote, or a reply that sits below a header we cannot split, is uncertain.
 */
function stripHtmlQuotes(html: string): { html: string; uncertain: boolean } {
  const tagRe = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)\b([^>]*)\/?>/g;
  let out = "";
  let last = 0;
  const stack: Array<{ name: string; quote: boolean }> = [];
  let quoteDepth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    if (quoteDepth === 0) out += html.slice(last, match.index);
    last = tagRe.lastIndex;
    if (match[0].startsWith("<!--")) continue;
    const name = match[1].toLowerCase();
    const attrs = match[2] ?? "";
    const closing = match[0].startsWith("</");
    const selfClosing = /\/>$/.test(match[0]) || ["br", "hr", "img", "meta", "link", "input"].includes(name);
    if (!closing && isOutlookCut(name, attrs)) {
      const prefix = htmlToText(out);
      const rest = htmlToText(html.slice(match.index));
      if (!prefix && rest) return { html: "", uncertain: true };
      return { html: out, uncertain: false };
    }
    if (closing) {
      let found = false;
      while (stack.length > 0) {
        const top = stack.pop();
        if (!top) break;
        if (top.quote) quoteDepth = Math.max(0, quoteDepth - 1);
        if (top.name === name) {
          found = true;
          break;
        }
      }
      if (!found && quoteDepth > 0) return { html: "", uncertain: true };
      continue;
    }
    if (!selfClosing) {
      const quote = isQuoteTag(name, attrs);
      stack.push({ name, quote });
      if (quote) quoteDepth += 1;
    }
  }
  if (quoteDepth > 0) return { html: out, uncertain: !htmlToText(out) };
  out += html.slice(last);
  return { html: out, uncertain: false };
}

function hasUnresolvedQuoteMarker(text: string): boolean {
  return /^-{3,}\s*Original Message\s*-{3,}/im.test(text)
    || /^On .{8,180} wrote:\s*$/im.test(text)
    || /^>{1,}\s?/m.test(text);
}

function separatePlainEmail(text: string): { text: string; uncertain: boolean } {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const cut = lines.findIndex((line) =>
    /^>{1,}\s?/.test(line)
    || /^On .{8,180} wrote:\s*$/i.test(line)
    || /^-{3,}\s*Original Message\s*-{3,}/i.test(line)
  );
  if (cut === -1) {
    const plain = normalized.replace(/\s+/g, " ").trim();
    return { text: plain, uncertain: false };
  }
  const kept = lines.slice(0, cut).join(" ").replace(/\s+/g, " ").trim();
  const remainder = lines.slice(cut).join(" ").replace(/\s+/g, " ").trim();
  if (!kept && remainder) return { text: "", uncertain: true };
  return { text: kept, uncertain: false };
}

function separateEmailReply(raw: string, asHtml: boolean): { text: string; uncertain: boolean } {
  if (!asHtml) return separatePlainEmail(raw);
  const stripped = stripHtmlQuotes(raw);
  if (stripped.uncertain) return { text: "", uncertain: true };
  const text = htmlToText(stripped.html);
  if (hasUnresolvedQuoteMarker(text)) return { text: "", uncertain: true };
  return { text, uncertain: false };
}

function stableSegmentId(ticketId: string, timestamp: string, text: string): string {
  const input = `${ticketId}|${timestamp}|${text}`;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) | 0;
  }
  return `zendesk-${(hash >>> 0).toString(16)}-${input.length}`;
}

export function customerSegmentFromConversationEntry(
  entry: ZendeskConversationEntry,
  ticketId: string,
): ConversationDecision {
  const role = canonicalRole(entry.author?.role);
  if (!role) return { accepted: false, reason: "uncertain-sender" };
  if (role !== CONFIRMED_CUSTOMER_ROLE) return { accepted: false, reason: "not-customer" };

  const channel = canonicalChannel(entry.channel?.name);
  if (!TEXT_CHANNELS.has(channel)) return { accepted: false, reason: "non-text-channel" };

  const contentType = canonicalContentType(entry.message?.contentType);
  if (contentType && contentType !== "text/plain" && contentType !== "text/html") {
    return { accepted: false, reason: "non-text-channel" };
  }

  const raw = entry.message?.content;
  if (typeof raw !== "string") return { accepted: false, reason: "empty" };
  const asHtml = contentType === "text/html" || (contentType === "" && HTML_CHANNELS.has(channel));
  let text = "";
  if (EMAIL_CHANNELS.has(channel)) {
    const reply = separateEmailReply(raw, asHtml);
    if (reply.uncertain) return { accepted: false, reason: "uncertain-quote" };
    text = reply.text;
  } else {
    text = asHtml ? htmlToText(raw) : raw.replace(/\s+/g, " ").trim();
  }
  if (!text) return { accepted: false, reason: "empty" };

  const timestamp = entry.timestamp?.trim() ?? "";
  if (!timestamp) return { accepted: false, reason: "missing-timestamp" };

  return {
    accepted: true,
    segment: {
      segmentId: stableSegmentId(ticketId, timestamp, text),
      conversationId: supportConversationId(channel, ticketId),
      speaker: "customer",
      text,
      timestamp,
    },
  };
}

export type ConversationDiagnostics = {
  received: boolean;
  entryCount: number;
  endUserEvaluated: number;
  agentOrAdminSkipped: number;
  readFailed: boolean;
};

/** Counts only. The result has no names, addresses, or message text. */
export function conversationDiagnostics(entries: ZendeskConversationEntry[]): ConversationDiagnostics {
  let endUserEvaluated = 0;
  let agentOrAdminSkipped = 0;
  for (const entry of entries) {
    const role = canonicalRole(entry.author?.role);
    if (role === "agent" || role === "admin") {
      agentOrAdminSkipped += 1;
      continue;
    }
    if (role !== CONFIRMED_CUSTOMER_ROLE) continue;
    const decision = customerSegmentFromConversationEntry(entry, "count");
    if (decision.accepted) endUserEvaluated += 1;
  }
  return {
    received: true,
    entryCount: entries.length,
    endUserEvaluated,
    agentOrAdminSkipped,
    readFailed: false,
  };
}

export type EmailDiagnostics = {
  connected: boolean;
  entriesReceived: number;
  endUserRepliesEvaluated: number;
  agentOrAdminRepliesSkipped: number;
  readFailed: boolean;
};

/** Email counts for the Zendesk web channel. No names, addresses, or reply text. */
export function emailDiagnostics(entries: ZendeskConversationEntry[]): EmailDiagnostics {
  let entriesReceived = 0;
  let endUserRepliesEvaluated = 0;
  let agentOrAdminRepliesSkipped = 0;
  for (const entry of entries) {
    const channel = canonicalChannel(entry.channel?.name);
    if (!EMAIL_CHANNELS.has(channel)) continue;
    entriesReceived += 1;
    const role = canonicalRole(entry.author?.role);
    if (role === "agent" || role === "admin") {
      agentOrAdminRepliesSkipped += 1;
      continue;
    }
    if (role !== CONFIRMED_CUSTOMER_ROLE) continue;
    const decision = customerSegmentFromConversationEntry(entry, "count");
    if (decision.accepted) endUserRepliesEvaluated += 1;
  }
  return {
    connected: true,
    entriesReceived,
    endUserRepliesEvaluated,
    agentOrAdminRepliesSkipped,
    readFailed: false,
  };
}

export type ChatDiagnostics = {
  entriesReceived: number;
  endUserMessagesEvaluated: number;
  agentOrAdminMessagesSkipped: number;
};

/** Messaging counts only. A zero count does not mean the chat channel is connected. */
export function chatDiagnostics(entries: ZendeskConversationEntry[]): ChatDiagnostics {
  let entriesReceived = 0;
  let endUserMessagesEvaluated = 0;
  let agentOrAdminMessagesSkipped = 0;
  for (const entry of entries) {
    const channel = canonicalChannel(entry.channel?.name);
    if (!MESSAGING_CHANNELS.has(channel)) continue;
    entriesReceived += 1;
    const role = canonicalRole(entry.author?.role);
    if (role === "agent" || role === "admin") {
      agentOrAdminMessagesSkipped += 1;
      continue;
    }
    if (role !== CONFIRMED_CUSTOMER_ROLE) continue;
    const decision = customerSegmentFromConversationEntry(entry, "count");
    if (decision.accepted) endUserMessagesEvaluated += 1;
  }
  return { entriesReceived, endUserMessagesEvaluated, agentOrAdminMessagesSkipped };
}

export function formatChatDiagnostics(report: ChatDiagnostics): string {
  return [
    `Entries received: ${report.entriesReceived}`,
    `End-user messages evaluated: ${report.endUserMessagesEvaluated}`,
    `Agent/admin messages skipped: ${report.agentOrAdminMessagesSkipped}`,
  ].join("\n");
}

export function formatEmailDiagnostics(report: EmailDiagnostics): string {
  return [
    `Connected: ${report.connected ? "yes" : "no"}`,
    `Entries received: ${report.entriesReceived}`,
    `End-user replies evaluated: ${report.endUserRepliesEvaluated}`,
    `Agent/admin replies skipped: ${report.agentOrAdminRepliesSkipped}`,
    `Read failed: ${report.readFailed ? "yes" : "no"}`,
  ].join("\n");
}

export function formatConversationDiagnostics(report: ConversationDiagnostics): string {
  return [
    `Conversation received: ${report.received ? "yes" : "no"}`,
    `Entries received: ${report.entryCount}`,
    `End-user messages evaluated: ${report.endUserEvaluated}`,
    `Agent/admin messages skipped: ${report.agentOrAdminSkipped}`,
    `Read failed: ${report.readFailed ? "yes" : "no"}`,
  ].join("\n");
}

export function ingestZendeskConversation(
  store: BoundaryShieldSessionStore,
  ticketId: string,
  entries: ZendeskConversationEntry[],
): { alerts: BoundaryShieldAlert[]; decisions: ConversationDecision[] } {
  const alerts: BoundaryShieldAlert[] = [];
  const decisions = entries.map((entry) => customerSegmentFromConversationEntry(entry, ticketId));
  for (const decision of decisions) {
    if (!decision.accepted) continue;
    const result = store.ingest(decision.segment);
    if (result.alert) alerts.push(result.alert);
  }
  return { alerts, decisions };
}
