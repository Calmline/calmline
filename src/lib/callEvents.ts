import { supabase } from "@/lib/supabase";

export type CallEventSpeaker = "agent" | "customer";

const VALID_ESCALATION_LEVELS = ["Low", "Moderate", "High", "Critical"] as const;

export type EscalationLevel = (typeof VALID_ESCALATION_LEVELS)[number];

export type CallEventInsert = {
  callId: string;
  timestamp?: string; // ISO; defaults to now in DB
  speaker?: CallEventSpeaker | null;
  transcriptSegment: string;
  rollingEscalationRisk: number;
  rollingComplaintRisk: number;
  detectedTriggers: string[];
  suggestedScript: string | null;
  tacticalGuidance: string | null;
  responseLatencyMs: number | null;
  escalationLevel: EscalationLevel;
  urgencyLevel: "low" | "medium" | "high" | "critical";
};

/** Normalize AI output: trim whitespace, capitalize (Low/Moderate/High/Critical). Default "Low" if undefined. */
function normalizeEscalationLevel(
  level: string | undefined | null
): EscalationLevel {
  const trimmed =
    level != null && typeof level === "string" ? level.trim() : "";
  if (!trimmed) return "Low";
  const lower = trimmed.toLowerCase();
  if (lower === "medium") return "Moderate";
  const capitalized =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return VALID_ESCALATION_LEVELS.includes(capitalized as EscalationLevel)
    ? (capitalized as EscalationLevel)
    : "Low";
}

export function toUrgencyLevel(
  escalationLevel: string
): "low" | "medium" | "high" | "critical" {
  switch (escalationLevel) {
    case "Critical":
      return "critical";
    case "High":
      return "high";
    case "Moderate":
      return "medium";
    case "Low":
    default:
      return "low";
  }
}

/**
 * Log a structured call event for live sessions. Use with a stable callId
 * per session to reconstruct full escalation trajectories later.
 */
export async function insertCallEvent(event: CallEventInsert): Promise<{ id: string }> {
  let escalationLevel: EscalationLevel =
    typeof event.escalationLevel === "string"
      ? normalizeEscalationLevel(event.escalationLevel)
      : "Low";
  if (!VALID_ESCALATION_LEVELS.includes(escalationLevel)) {
    escalationLevel = "Low";
  }
  console.log("[call_events] escalationLevel before insert:", escalationLevel);

  const row = {
    call_id: event.callId,
    timestamp: event.timestamp ?? new Date().toISOString(),
    speaker: event.speaker ?? null,
    transcript_segment: event.transcriptSegment,
    rolling_escalation_risk: Math.max(0, Math.min(100, Math.round(event.rollingEscalationRisk))),
    rolling_complaint_risk: Math.max(0, Math.min(100, Math.round(event.rollingComplaintRisk))),
    detected_triggers: Array.isArray(event.detectedTriggers) ? event.detectedTriggers : [],
    suggested_script: event.suggestedScript ?? null,
    tactical_guidance: event.tacticalGuidance ?? null,
    response_latency_ms: event.responseLatencyMs ?? null,
    escalation_level: escalationLevel,
    urgency_level: event.urgencyLevel ?? toUrgencyLevel(escalationLevel),
  };

  const { data, error } = await supabase
    .from("call_events")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

/**
 * Fetch all events for a call in chronological order (for trajectory reconstruction).
 */
export async function getCallEvents(callId: string) {
  const { data, error } = await supabase
    .from("call_events")
    .select("*")
    .eq("call_id", callId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return data;
}
