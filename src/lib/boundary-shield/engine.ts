import { detectAbusiveLanguage } from "./abuseDetection";
import { emailIncidentDecision, emailThreatLevel } from "./emailIncident";
import { AGENT_ACTIONS, WARNING_LADDER_SCRIPTS, alertTitle } from "./scripts";
import type {
  AbuseKind,
  AlertRung,
  BoundaryShieldAlert,
  CallBoundaryState,
  IngestResult,
  TranscriptSegment,
  WarningRung,
} from "./types";

/**
 * Extra directed-harassment phrases for this prototype.
 * They are not added to the live gateway classifier, so phone coaching stays as it is.
 * Ordinary complaints ("this is ridiculous", "your company is useless") are intentionally absent.
 */
const DIRECTED_HARASSMENT = [
  /\byou(?:'re|re| are)\s+disgusting\b/i,
  /\byou\s+disgusting\b/i,
];

/**
 * Identity-based attacks. Complaints about discrimination stay out of this list.
 * These patterns are not added to the live gateway classifier.
 */
const DIRECTED_DISCRIMINATION = [
  /\bgo back to your country\b/i,
  /\bgo back where you came from\b/i,
  /\b(?:nigger|nigga|kike|spic|chink|gook|wetback|faggot|tranny|retard)s?\b/i,
];

/** Detection-only. The text shown to the agent stays the original reply. */
export function normalizeForDetection(text: string): string {
  const withoutInvisible = text.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g,
    "",
  );
  const punctuated = withoutInvisible
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035\uFF07]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, "\"")
    .replace(/\b[a-zA-Z](?:[.\-_*]+[a-zA-Z]){2,}\b/g, (match) => match.replace(/[.\-_*]+/g, ""))
    .replace(/([!?.,])\1+/g, "$1");
  return punctuated;
}

type InternalCall = {
  conversationId: string;
  rung: WarningRung;
  hostileCount: number;
  openAlert: BoundaryShieldAlert | null;
  alertHistory: BoundaryShieldAlert[];
  acknowledgedAlertIds: string[];
  continuedAfterAlert: boolean;
  supervisorReviewRequested: boolean;
  segments: TranscriptSegment[];
  seenSegmentIds: Set<string>;
  seenFingerprints: Set<string>;
};

function fingerprint(segment: TranscriptSegment): string {
  return [
    segment.conversationId.trim(),
    segment.speaker,
    segment.timestamp.trim(),
    segment.text.trim().toLowerCase(),
  ].join("|");
}

function classifyCustomerText(text: string): {
  abusive: boolean;
  threat: boolean;
  insult: boolean;
  harassment: boolean;
  discrimination: boolean;
} {
  const normalized = normalizeForDetection(text);
  const harassment = DIRECTED_HARASSMENT.some((pattern) => pattern.test(normalized));
  const discrimination = DIRECTED_DISCRIMINATION.some((pattern) => pattern.test(normalized));
  const detected = detectAbusiveLanguage(normalized, null);
  const threat = detected.abusiveDetected && detected.severity === "severe";
  const insult =
    detected.abusiveDetected && detected.allowTerminationScript && !threat && !discrimination;
  return {
    abusive: threat || insult || harassment || discrimination,
    threat,
    insult,
    harassment,
    discrimination,
  };
}

function nextRung(current: WarningRung, threat: boolean): AlertRung {
  if (threat) return "severe_threat";
  if (current === "clear") return "first_warning";
  if (current === "first_warning") return "final_warning";
  if (current === "severe_threat") return "severe_threat";
  return "final_warning";
}

function kindFor(
  classification: { threat: boolean; harassment: boolean; discrimination: boolean; insult: boolean },
  hostileCountAfter: number,
): AbuseKind {
  if (classification.threat) return "threat";
  if (classification.discrimination) return "discrimination";
  if (classification.harassment || hostileCountAfter >= 2) return "harassment";
  return "insult";
}

function emptyCall(conversationId: string): InternalCall {
  return {
    conversationId,
    rung: "clear",
    hostileCount: 0,
    openAlert: null,
    alertHistory: [],
    acknowledgedAlertIds: [],
    continuedAfterAlert: false,
    supervisorReviewRequested: false,
    segments: [],
    seenSegmentIds: new Set(),
    seenFingerprints: new Set(),
  };
}

function toPublic(call: InternalCall): CallBoundaryState {
  return {
    conversationId: call.conversationId,
    rung: call.rung,
    hostileCount: call.hostileCount,
    openAlert: call.openAlert,
    alertHistory: [...call.alertHistory],
    acknowledgedAlertIds: [...call.acknowledgedAlertIds],
    continuedAfterAlert: call.continuedAfterAlert,
    supervisorReviewRequested: call.supervisorReviewRequested,
    segments: [...call.segments],
  };
}

function assertSegment(segment: TranscriptSegment): void {
  if (!segment || typeof segment !== "object") {
    throw new Error("Transcript segment is required");
  }
  if (!segment.conversationId?.trim() || !segment.segmentId?.trim()) {
    throw new Error("Transcript segment requires conversationId and segmentId");
  }
  if (!segment.timestamp?.trim()) {
    throw new Error("Transcript segment requires a timestamp");
  }
  if (segment.speaker !== "customer" && segment.speaker !== "agent" && segment.speaker !== "system") {
    throw new Error("Transcript segment speaker must be customer, agent, or system");
  }
  if (typeof segment.text !== "string") {
    throw new Error("Transcript segment text must be a string");
  }
}

/**
 * Per-conversation Boundary Shield state.
 * Each conversationId has its own ladder. Replays of the same segment id,
 * or the same speaker + timestamp + text, do not raise a second alert.
 */
export class BoundaryShieldSessionStore {
  private readonly calls = new Map<string, InternalCall>();

  getState(conversationId: string): CallBoundaryState | null {
    const call = this.calls.get(conversationId);
    return call ? toPublic(call) : null;
  }

  listStates(): CallBoundaryState[] {
    return Array.from(this.calls.values(), (call) => toPublic(call));
  }

  ingest(segment: TranscriptSegment): IngestResult {
    assertSegment(segment);
    const conversationId = segment.conversationId.trim();
    const call = this.calls.get(conversationId) ?? emptyCall(conversationId);
    this.calls.set(conversationId, call);

    if (call.seenSegmentIds.has(segment.segmentId) || call.seenFingerprints.has(fingerprint(segment))) {
      return { duplicate: true, ignoredSpeaker: false, alert: null, state: toPublic(call) };
    }

    call.seenSegmentIds.add(segment.segmentId);
    call.seenFingerprints.add(fingerprint(segment));
    call.segments.push(segment);

    if (segment.speaker !== "customer" || segment.text.trim().length === 0) {
      return { duplicate: false, ignoredSpeaker: segment.speaker !== "customer", alert: null, state: toPublic(call) };
    }

    const classification = classifyCustomerText(segment.text);
    if (conversationId.startsWith("email-")) {
      const normalized = normalizeForDetection(segment.text).toLowerCase();
      const detectedLevel = emailThreatLevel(normalized);
      const level = detectedLevel === "none" && classification.threat ? "credible" : detectedLevel;
      const decision = emailIncidentDecision({
        level,
        insult: classification.insult,
        harassment: classification.harassment,
        discrimination: classification.discrimination,
        priorRung: call.rung,
        hostileCountAfter: call.hostileCount + 1,
      });
      if (!decision) {
        return { duplicate: false, ignoredSpeaker: false, alert: null, state: toPublic(call) };
      }
      call.hostileCount += 1;
      const alert: BoundaryShieldAlert = {
        id: `${conversationId}:${segment.segmentId}:${decision.rung}`,
        conversationId,
        segmentId: segment.segmentId,
        rung: decision.rung,
        kind: decision.kind,
        title: decision.title,
        script: decision.script,
        triggeringText: segment.text.trim(),
        actions: AGENT_ACTIONS,
        assessment: decision.assessment,
      };
      call.rung = decision.rung;
      call.alertHistory.push(alert);
      call.openAlert = alert;
      return { duplicate: false, ignoredSpeaker: false, alert, state: toPublic(call) };
    }
    if (!classification.abusive) {
      return { duplicate: false, ignoredSpeaker: false, alert: null, state: toPublic(call) };
    }

    call.hostileCount += 1;
    const rung = nextRung(call.rung, classification.threat);
    const kind = kindFor(classification, call.hostileCount);
    const alert: BoundaryShieldAlert = {
      id: `${conversationId}:${segment.segmentId}:${rung}`,
      conversationId,
      segmentId: segment.segmentId,
      rung,
      kind,
      title: alertTitle(rung, kind),
      script: WARNING_LADDER_SCRIPTS[rung],
      triggeringText: segment.text.trim(),
      actions: AGENT_ACTIONS,
    };
    call.rung = rung;
    call.alertHistory.push(alert);
    call.openAlert = alert;
    return { duplicate: false, ignoredSpeaker: false, alert, state: toPublic(call) };
  }

  acknowledge(conversationId: string, alertId?: string): CallBoundaryState | null {
    const call = this.calls.get(conversationId);
    if (!call?.openAlert) return call ? toPublic(call) : null;
    if (alertId && call.openAlert.id !== alertId) return toPublic(call);
    call.acknowledgedAlertIds.push(call.openAlert.id);
    call.openAlert = null;
    return toPublic(call);
  }

  continueCall(conversationId: string): CallBoundaryState | null {
    const call = this.calls.get(conversationId);
    if (!call) return null;
    if (call.openAlert) call.continuedAfterAlert = true;
    call.openAlert = null;
    return toPublic(call);
  }

  requestSupervisorReview(conversationId: string): CallBoundaryState | null {
    const call = this.calls.get(conversationId);
    if (!call) return null;
    call.supervisorReviewRequested = true;
    call.openAlert = null;
    return toPublic(call);
  }
}
