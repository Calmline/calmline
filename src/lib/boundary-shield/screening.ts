import { BoundaryShieldSessionStore } from "./engine";
import type { AbuseKind, TranscriptSegment } from "./types";

/**
 * Pre-assignment screening decisions.
 * This module never calls Zendesk. A sidebar cannot hold a ticket before
 * assignment, so protected routing is a proposal until a backend is approved.
 */
export type ScreeningMode = "monitor" | "protected-routing";

export type ScreeningSeverity = "none" | AbuseKind;

export type ReviewState = "clear" | "flagged" | "pending-review" | "approved" | "dismissed" | "escalated" | "released";

export type SupervisorAction = "approve" | "dismiss" | "escalate" | "release";

export type ProposedRouting = {
  executed: false;
  effect: "observe" | "leave-in-normal-queue" | "hold-for-review" | "release-to-assignment";
  tag: string | null;
  reviewGroupId: string | null;
  reviewField: string | null;
};

export type ScreeningAuditEvent = {
  at: string;
  ticketId: string;
  type: "classified" | "duplicate" | "ignored-speaker" | SupervisorAction;
  mode: ScreeningMode;
  severity: ScreeningSeverity;
  reviewState: ReviewState;
  proposed: ProposedRouting;
};

export type TicketScreening = {
  ticketId: string;
  mode: ScreeningMode;
  severity: ScreeningSeverity;
  reviewState: ReviewState;
  duplicate: boolean;
  ignoredSpeaker: boolean;
  proposed: ProposedRouting;
};

export type ScreeningConfig = {
  mode: ScreeningMode;
  /** Zendesk group that would review held tickets. Null until an admin chooses one. */
  reviewGroupId: string | null;
  protectedTag?: string;
};

const DEFAULT_TAG = "calmline_protected_queue";
const REVIEW_FIELD = "calmline_review_state";

function proposal(
  effect: ProposedRouting["effect"],
  tag: string | null,
  reviewGroupId: string | null,
  reviewField: string | null,
): ProposedRouting {
  return { executed: false, effect, tag, reviewGroupId, reviewField };
}

function severityFromKind(kind: AbuseKind | null): ScreeningSeverity {
  return kind ?? "none";
}

/**
 * Local screening record. Live ticket updates stay off.
 */
export class EmailScreeningLedger {
  private readonly store = new BoundaryShieldSessionStore();
  private readonly tickets = new Map<string, TicketScreening>();
  private readonly auditLog: ScreeningAuditEvent[] = [];
  private readonly tag: string;
  /** Present so callers can see that Zendesk writes are not available. */
  readonly writesEnabled = false;

  private readonly config: ScreeningConfig;

  constructor(config: ScreeningConfig) {
    this.config = config;
    this.tag = config.protectedTag?.trim() || DEFAULT_TAG;
  }

  audit(): readonly ScreeningAuditEvent[] {
    return this.auditLog.map((event) => ({ ...event, proposed: { ...event.proposed } }));
  }

  get(ticketId: string): TicketScreening | null {
    const found = this.tickets.get(ticketId);
    return found ? { ...found, proposed: { ...found.proposed } } : null;
  }

  classify(input: {
    ticketId: string;
    segmentId: string;
    speaker: TranscriptSegment["speaker"];
    text: string;
    timestamp: string;
  }): TicketScreening {
    const ticketId = input.ticketId.trim();
    const result = this.store.ingest({
      segmentId: input.segmentId,
      conversationId: `email-${ticketId}`,
      speaker: input.speaker,
      text: input.text,
      timestamp: input.timestamp,
    });
    const previous = this.tickets.get(ticketId);
    if (result.ignoredSpeaker && previous) {
      const kept: TicketScreening = { ...previous, duplicate: false, ignoredSpeaker: true, proposed: { ...previous.proposed } };
      this.record("ignored-speaker", kept, input.timestamp);
      return { ...kept, proposed: { ...kept.proposed } };
    }
    const severity = result.duplicate
      ? previous?.severity ?? "none"
      : severityFromKind(result.alert?.kind ?? null);
    const reviewState = this.reviewStateFor(severity, result.duplicate, previous?.reviewState);
    const proposed = this.proposalFor(reviewState, severity);
    const screening: TicketScreening = {
      ticketId,
      mode: this.config.mode,
      severity,
      reviewState,
      duplicate: result.duplicate,
      ignoredSpeaker: result.ignoredSpeaker,
      proposed,
    };
    this.tickets.set(ticketId, screening);
    this.record(result.duplicate ? "duplicate" : result.ignoredSpeaker ? "ignored-speaker" : "classified", screening, input.timestamp);
    return { ...screening, proposed: { ...proposed } };
  }

  review(ticketId: string, action: SupervisorAction, at: string): TicketScreening | null {
    const current = this.tickets.get(ticketId.trim());
    if (!current || current.severity === "none") return current ? { ...current, proposed: { ...current.proposed } } : null;
    const reviewState: ReviewState =
      action === "approve" ? "approved"
      : action === "dismiss" ? "dismissed"
      : action === "escalate" ? "escalated"
      : "released";
    const proposed = this.proposalFor(reviewState, current.severity);
    const next: TicketScreening = { ...current, reviewState, proposed, duplicate: false };
    this.tickets.set(next.ticketId, next);
    this.record(action, next, at);
    return { ...next, proposed: { ...proposed } };
  }

  private reviewStateFor(severity: ScreeningSeverity, duplicate: boolean, previous: ReviewState | undefined): ReviewState {
    if (duplicate && previous) return previous;
    if (severity === "none") return "clear";
    if (this.config.mode === "monitor") return "flagged";
    return "pending-review";
  }

  private proposalFor(reviewState: ReviewState, severity: ScreeningSeverity): ProposedRouting {
    if (this.config.mode === "monitor" || severity === "none" || reviewState === "clear") {
      return proposal(this.config.mode === "monitor" ? "observe" : "leave-in-normal-queue", null, null, null);
    }
    if (reviewState === "dismissed" || reviewState === "released") {
      return proposal("release-to-assignment", null, null, reviewState);
    }
    return proposal("hold-for-review", this.tag, this.config.reviewGroupId, reviewState);
  }

  private record(type: ScreeningAuditEvent["type"], screening: TicketScreening, at: string): void {
    this.auditLog.push({
      at,
      ticketId: screening.ticketId,
      type,
      mode: screening.mode,
      severity: screening.severity,
      reviewState: screening.reviewState,
      proposed: { ...screening.proposed },
    });
  }
}
