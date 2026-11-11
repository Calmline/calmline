/** Speaker on a transcript segment. Only customer speech can raise an alert. */
export type SpeakerRole = "customer" | "agent" | "system";

/** One utterance in a conversation. Timestamps are part of duplicate detection. */
export type TranscriptSegment = {
  segmentId: string;
  conversationId: string;
  speaker: SpeakerRole;
  text: string;
  /** ISO-8601 time or any stable timestamp string supplied by the caller. */
  timestamp: string;
};

export type WarningRung = "clear" | "first_warning" | "final_warning" | "severe_threat";

export type AlertRung = Exclude<WarningRung, "clear">;

/** Why the segment crossed the line. Ordinary frustration is not a kind. */
export type AbuseKind = "insult" | "harassment" | "discrimination" | "threat";

export type AgentAction = "acknowledge" | "continue" | "request_supervisor_review";

/** Email incident display. Phone alerts omit this and keep the call scripts. */
export type IncidentAssessment = {
  category: "Insult" | "Harassment" | "Discriminatory abuse" | "Credible threat" | "Severe threat";
  severityLabel: "Warning" | "Final warning" | "Critical";
  recommendedAction: string;
  managerReviewRecommended: boolean;
};

export type BoundaryShieldAlert = {
  id: string;
  conversationId: string;
  segmentId: string;
  rung: AlertRung;
  kind: AbuseKind;
  title: string;
  script: string;
  triggeringText: string;
  /** Shown to the agent. All three stay available; none is automatic. */
  actions: readonly AgentAction[];
  /** Present for email incidents. Absent for the call ladder. */
  assessment?: IncidentAssessment;
};

export type CallBoundaryState = {
  conversationId: string;
  rung: WarningRung;
  hostileCount: number;
  openAlert: BoundaryShieldAlert | null;
  alertHistory: BoundaryShieldAlert[];
  acknowledgedAlertIds: string[];
  continuedAfterAlert: boolean;
  supervisorReviewRequested: boolean;
  segments: TranscriptSegment[];
};

export type IngestResult = {
  duplicate: boolean;
  ignoredSpeaker: boolean;
  alert: BoundaryShieldAlert | null;
  state: CallBoundaryState;
};
