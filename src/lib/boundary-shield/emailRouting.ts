import type { RoutingStore } from "./routingStore";
import { EmailScreeningLedger } from "./screening";
import type { ScreeningSeverity, TicketScreening } from "./screening";
import { verifyZendeskWebhookSignature } from "./zendeskWebhookSignature";

/**
 * Safe-test routing for incoming email.
 * Decisions are proposals only. This module has no Zendesk client and cannot
 * change a ticket, send a reply, or close anything until a later approval.
 */
export const ROUTING_WRITES_ENABLED = false as const;

export type RoutingState = "pending" | "clear" | "protected";

export type RoutingEffect = "hold-pending" | "release-to-normal-queue" | "hold-for-review";

export type ProposedTicketUpdate = {
  executed: false;
  ticketId: string;
  groupId: string | null;
  assigneeId: null;
  tagsToAdd: readonly string[];
  tagsToRemove: readonly string[];
  reviewState: string | null;
  /** Customer history is never replaced or commented on. */
  publicComment: null;
  status: null;
};

export type RoutingDecision = {
  accountId: string;
  ticketId: string;
  commentId: string;
  createdAt: string;
  state: RoutingState;
  effect: RoutingEffect;
  severity: ScreeningSeverity | "unclassified";
  reason: string;
  /** Failures and unknown senders block a release. Staff comments do not. */
  blocksRelease: boolean;
  executed: false;
  update: ProposedTicketUpdate;
};

export type RoutingAuditEvent = {
  at: string;
  accountId: string;
  ticketId: string;
  commentId: string;
  type: "classified" | "duplicate" | "held";
  state: RoutingState;
  severity: RoutingDecision["severity"];
  effect: RoutingEffect;
  reason: string;
  executed: false;
};

export type RoutingEvent = {
  accountId: string;
  ticketId: string;
  commentId: string;
  channel: string;
  authorRole: string;
  publicComment: boolean | null;
  text: string;
  createdAt: string;
};

type ClassifyInput = {
  ticketId: string;
  segmentId: string;
  speaker: "customer" | "agent" | "system";
  text: string;
  timestamp: string;
};

const PENDING_TAG = "calmline_screen_pending";
const CLEAR_TAG = "calmline_screen_clear";
const PROTECTED_TAG = "calmline_protected_queue";

function clean(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function canonicalRole(role: string): "end-user" | "agent" | "admin" | "uncertain" {
  const value = role.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (value === "end-user") return "end-user";
  if (value === "agent" || value === "admin") return value;
  return "uncertain";
}

function isEmailChannel(channel: string): boolean {
  const value = channel.trim().toLowerCase();
  return value === "email" || value === "mail";
}

export class EmailRoutingWorkflow {
  readonly writesEnabled = ROUTING_WRITES_ENABLED;
  private readonly ledger: EmailScreeningLedger;
  private readonly decisions = new Map<string, RoutingDecision>();
  private readonly auditLog: RoutingAuditEvent[] = [];
  private readonly reviewGroupId: string | null;
  private readonly normalGroupId: string | null;
  private readonly classify: (input: ClassifyInput) => TicketScreening;
  private readonly store: RoutingStore | null;

  constructor(config: {
    reviewGroupId?: string | null;
    normalGroupId?: string | null;
    classify?: (input: ClassifyInput) => TicketScreening;
    store?: RoutingStore | null;
  } = {}) {
    this.reviewGroupId = config.reviewGroupId ?? null;
    this.normalGroupId = config.normalGroupId ?? null;
    this.store = config.store ?? null;
    this.ledger = new EmailScreeningLedger({
      mode: "protected-routing",
      reviewGroupId: this.reviewGroupId,
    });
    this.classify = config.classify ?? ((input) => this.ledger.classify(input));
  }

  audit(): readonly RoutingAuditEvent[] {
    return this.auditLog.map((event) => ({ ...event }));
  }

  /**
   * Classifies one simulated or future webhook event.
   * A failure, unknown sender, or non-email event stays pending and is not released.
   */
  handle(event: RoutingEvent, at: string): RoutingDecision {
    try {
      return this.handleSafely(event, at);
    } catch {
      return this.hold(event, "storage-failed");
    }
  }

  /** Reclassifies a stored failure. A successful protect or clear is not replayed. */
  recover(event: RoutingEvent, at: string): RoutingDecision {
    const accountId = event.accountId.trim();
    const ticketId = event.ticketId.trim();
    const commentId = event.commentId.trim();
    const existing = this.find(accountId, ticketId, commentId);
    if (existing?.reason !== "classification-failed") return this.handle(event, at);
    const key = `${accountId}|${ticketId}|${commentId}`;
    this.decisions.delete(key);
    this.store?.deleteDecision(accountId, ticketId, commentId);
    return this.handle(event, at);
  }

  ticketState(accountId: string, ticketId: string): RoutingState {
    return ticketDisposition(this.listTicket(accountId, ticketId));
  }

  private handleSafely(event: RoutingEvent, at: string): RoutingDecision {
    const accountId = event.accountId.trim();
    const ticketId = event.ticketId.trim();
    const commentId = event.commentId.trim();
    const key = accountId && ticketId && commentId ? `${accountId}|${ticketId}|${commentId}` : "";
    if (key) {
      const existing = this.find(accountId, ticketId, commentId);
      if (existing) {
        const gated = this.gate(existing);
        this.record("duplicate", gated, at);
        return gated;
      }
    }
    let decision: RoutingDecision;
    try {
      decision = this.gate(this.decide(event, at));
    } catch {
      decision = this.hold(event, "classification-failed");
    }
    if (key) {
      this.decisions.set(key, decision);
      this.store?.putDecision(decision);
    }
    this.record(decision.state === "pending" ? "held" : "classified", decision, at);
    return decision;
  }

  private find(accountId: string, ticketId: string, commentId: string): RoutingDecision | null {
    if (!accountId || !ticketId || !commentId) return null;
    const key = `${accountId}|${ticketId}|${commentId}`;
    return this.decisions.get(key) ?? this.store?.getDecision(accountId, ticketId, commentId) ?? null;
  }

  private listTicket(accountId: string, ticketId: string): RoutingDecision[] {
    if (this.store) return this.store.listTicket(accountId, ticketId);
    const found: RoutingDecision[] = [];
    for (const decision of Array.from(this.decisions.values())) {
      if (decision.accountId === accountId && decision.ticketId === ticketId) found.push(decision);
    }
    return found;
  }

  /** A clear result cannot release a ticket that is already protected or unresolved. */
  private gate(decision: RoutingDecision): RoutingDecision {
    if (decision.effect !== "release-to-normal-queue") return decision;
    const others = this.listTicket(decision.accountId, decision.ticketId)
      .filter((item) => item.commentId !== decision.commentId);
    if (others.some((item) => item.state === "protected" || item.blocksRelease)) {
      return this.hold(decisionEvent(decision), "release-blocked");
    }
    return decision;
  }

  private decide(event: RoutingEvent, at: string): RoutingDecision {
    if (!event.accountId.trim() || !event.ticketId.trim() || !event.commentId.trim()) {
      return this.hold(event, "invalid-event");
    }
    if (!isEmailChannel(event.channel)) return this.hold(event, "not-email");
    if (event.publicComment === false) return this.hold(event, "not-public");
    const role = canonicalRole(event.authorRole);
    if (role === "uncertain") return this.hold(event, "uncertain-sender");
    if (role === "agent" || role === "admin") return this.hold(event, "staff-not-customer");
    const text = event.text.replace(/\s+/g, " ").trim();
    if (!text) return this.hold(event, "empty-message");
    const screening = this.classify({
      ticketId: event.ticketId.trim(),
      segmentId: `comment-${event.commentId.trim()}`,
      speaker: "customer",
      text,
      timestamp: event.createdAt.trim() || at,
    });
    if (screening.severity === "none") return this.release(event);
    return this.protect(event, screening.severity);
  }

  private hold(event: RoutingEvent, reason: string): RoutingDecision {
    return {
      accountId: event.accountId.trim(),
      ticketId: event.ticketId.trim(),
      commentId: event.commentId.trim(),
      createdAt: event.createdAt.trim() || new Date(0).toISOString(),
      state: "pending",
      effect: "hold-pending",
      severity: "unclassified",
      reason,
      blocksRelease: reason !== "staff-not-customer" && reason !== "release-blocked",
      executed: false,
      update: {
        executed: false,
        ticketId: event.ticketId.trim(),
        groupId: this.reviewGroupId,
        assigneeId: null,
        tagsToAdd: [PENDING_TAG],
        tagsToRemove: [],
        reviewState: "pending",
        publicComment: null,
        status: null,
      },
    };
  }

  private release(event: RoutingEvent): RoutingDecision {
    return {
      accountId: event.accountId.trim(),
      ticketId: event.ticketId.trim(),
      commentId: event.commentId.trim(),
      createdAt: event.createdAt.trim() || new Date(0).toISOString(),
      state: "clear",
      effect: "release-to-normal-queue",
      severity: "none",
      reason: "ordinary-customer-email",
      blocksRelease: false,
      executed: false,
      update: {
        executed: false,
        ticketId: event.ticketId.trim(),
        groupId: this.normalGroupId,
        assigneeId: null,
        tagsToAdd: [CLEAR_TAG],
        tagsToRemove: [PENDING_TAG],
        reviewState: "clear",
        publicComment: null,
        status: null,
      },
    };
  }

  private protect(event: RoutingEvent, severity: ScreeningSeverity): RoutingDecision {
    return {
      accountId: event.accountId.trim(),
      ticketId: event.ticketId.trim(),
      commentId: event.commentId.trim(),
      createdAt: event.createdAt.trim() || new Date(0).toISOString(),
      state: "protected",
      effect: "hold-for-review",
      severity,
      reason: "qualifying-customer-email",
      blocksRelease: false,
      executed: false,
      update: {
        executed: false,
        ticketId: event.ticketId.trim(),
        groupId: this.reviewGroupId,
        assigneeId: null,
        tagsToAdd: [PROTECTED_TAG],
        tagsToRemove: [PENDING_TAG],
        reviewState: "pending-review",
        publicComment: null,
        status: null,
      },
    };
  }

  private record(type: RoutingAuditEvent["type"], decision: RoutingDecision, at: string): void {
    const entry: RoutingAuditEvent = {
      at,
      accountId: decision.accountId,
      ticketId: decision.ticketId,
      commentId: decision.commentId,
      type,
      state: decision.state,
      severity: decision.severity,
      effect: decision.effect,
      reason: decision.reason,
      executed: false,
    };
    this.auditLog.push(entry);
    this.store?.appendAudit(entry);
  }
}

export function ticketDisposition(decisions: readonly RoutingDecision[]): RoutingState {
  if (decisions.some((decision) => decision.state === "protected")) return "protected";
  if (decisions.some((decision) => decision.blocksRelease)) return "pending";
  if (decisions.some((decision) => decision.effect === "release-to-normal-queue")) return "clear";
  return "pending";
}

function decisionEvent(decision: RoutingDecision): RoutingEvent {
  return {
    accountId: decision.accountId,
    ticketId: decision.ticketId,
    commentId: decision.commentId,
    channel: "email",
    authorRole: "end-user",
    publicComment: true,
    text: "",
    createdAt: decision.createdAt,
  };
}

export type WebhookReceipt = {
  status: 200 | 400 | 401;
  accepted: boolean;
  decision: RoutingDecision | null;
};

function channelFrom(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "channel" in value) {
    return clean((value as { channel?: unknown }).channel);
  }
  return "";
}

function eventFromPayload(payload: unknown): RoutingEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as {
    accountId?: unknown;
    account?: { subdomain?: unknown };
    ticket?: { id?: unknown; via?: unknown };
    comment?: {
      id?: unknown;
      body?: unknown;
      plain_body?: unknown;
      public?: unknown;
      created_at?: unknown;
      author?: { role?: unknown };
    };
  };
  const accountId = clean(record.accountId) || clean(record.account?.subdomain);
  const ticketId = clean(record.ticket?.id);
  const comment = record.comment;
  const commentId = clean(comment?.id);
  if (!accountId || !ticketId || !commentId) return null;
  const text = clean(comment?.plain_body) || clean(comment?.body);
  const visibility = comment?.public;
  return {
    accountId,
    ticketId,
    commentId,
    channel: channelFrom(record.ticket?.via),
    authorRole: clean(comment?.author?.role),
    publicComment: typeof visibility === "boolean" ? visibility : null,
    text,
    createdAt: clean(comment?.created_at),
  };
}

/**
 * Verifies the Zendesk signature before reading the event.
 * An invalid signature produces no release.
 */
export function receiveEmailRoutingWebhook(input: {
  secret: string;
  timestamp: string;
  signature: string;
  body: string;
  now: Date;
  workflow: EmailRoutingWorkflow;
}): WebhookReceipt {
  const verified = verifyZendeskWebhookSignature({
    secret: input.secret,
    timestamp: input.timestamp,
    body: input.body,
    signature: input.signature,
    now: input.now,
  });
  if (!verified.ok) return { status: 401, accepted: false, decision: null };
  let payload: unknown;
  try {
    payload = JSON.parse(input.body);
  } catch {
    return { status: 400, accepted: false, decision: null };
  }
  const event = eventFromPayload(payload);
  if (!event) {
    const held = input.workflow.handle({
      accountId: "",
      ticketId: "",
      commentId: "",
      channel: "",
      authorRole: "",
      publicComment: null,
      text: "",
      createdAt: input.timestamp,
    }, input.timestamp);
    return { status: 200, accepted: true, decision: held };
  }
  return {
    status: 200,
    accepted: true,
    decision: input.workflow.handle(event, input.timestamp),
  };
}
