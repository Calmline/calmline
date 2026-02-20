import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type TranscriptRow = {
  id: string;
  transcript_text: string;
  escalation_risk: number;
  complaint_risk: "Low" | "Medium" | "High";
  deescalation_response: string | null;
  tone_guidance: string | null;
  twilio_call_sid: string | null;
  twilio_contact_id: string | null;
  created_at: string;
};

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function insertTranscript(data: {
  transcript_text: string;
  escalation_risk: number;
  complaint_risk: "Low" | "Medium" | "High";
  deescalation_response: string | null;
  tone_guidance: string | null;
  twilio_call_sid?: string;
  twilio_contact_id?: string;
}) {
  const { data: row, error } = await supabase
    .from("transcripts")
    .insert(data)
    .select("id, created_at")
    .single();
  if (error) throw error;
  return row;
}

export async function getRecentTranscripts(limit = 20) {
  const { data, error } = await supabase
    .from("transcripts")
    .select("id, transcript_text, escalation_risk, complaint_risk, deescalation_response, tone_guidance, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as TranscriptRow[];
}

// --- call_events (escalation trajectory per call) ---

export type CallEventRow = {
  id: string;
  call_id: string;
  timestamp: string;
  speaker: string | null;
  transcript_segment: string;
  rolling_escalation_risk: number;
  rolling_complaint_risk: number;
  detected_triggers: string[];
  suggested_script: string | null;
  tactical_guidance: string | null;
  response_latency_ms: number | null;
  escalation_level: string;
  urgency_level: string;
};

export async function getCallEvents(options?: {
  callId?: string;
  since?: string; // ISO date
  limit?: number;
}) {
  let q = supabase
    .from("call_events")
    .select(
      "id, call_id, timestamp, speaker, transcript_segment, rolling_escalation_risk, rolling_complaint_risk, detected_triggers, suggested_script, tactical_guidance, response_latency_ms, escalation_level, urgency_level"
    )
    .order("timestamp", { ascending: false });
  if (options?.callId) q = q.eq("call_id", options.callId);
  if (options?.since) q = q.gte("timestamp", options.since);
  if (options?.limit) q = q.limit(options.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CallEventRow[];
}

export async function insertCallEvent(data: {
  call_id: string;
  speaker?: "agent" | "customer" | null;
  transcript_segment: string;
  rolling_escalation_risk: number;
  rolling_complaint_risk: number;
  detected_triggers?: string[];
  suggested_script?: string | null;
  tactical_guidance?: string | null;
  response_latency_ms?: number | null;
  escalation_level: "Low" | "Moderate" | "High" | "Critical";
  urgency_level: "low" | "medium" | "high" | "critical";
}) {
  const { data: row, error } = await supabase
    .from("call_events")
    .insert({
      call_id: data.call_id,
      speaker: data.speaker ?? null,
      transcript_segment: data.transcript_segment,
      rolling_escalation_risk: data.rolling_escalation_risk,
      rolling_complaint_risk: data.rolling_complaint_risk,
      detected_triggers: data.detected_triggers ?? [],
      suggested_script: data.suggested_script ?? null,
      tactical_guidance: data.tactical_guidance ?? null,
      response_latency_ms: data.response_latency_ms ?? null,
      escalation_level: data.escalation_level,
      urgency_level: data.urgency_level,
    })
    .select("id, timestamp")
    .single();
  if (error) throw error;
  return row;
}

// --- call_outcomes (for fine-tuning: supervisor requested or not) ---

export type CallOutcomeRow = {
  id: string;
  call_id: string;
  supervisor_requested: boolean;
  recorded_at: string;
  source: "manual" | "crm" | "integration" | "twilio" | null;
};

export type CallOutcomeSource = "manual" | "crm" | "integration" | "twilio";

/** Record or update outcome for a call. Idempotent by call_id (upsert). */
export async function upsertCallOutcome(data: {
  call_id: string;
  supervisor_requested: boolean;
  source?: CallOutcomeSource | null;
}) {
  const { data: row, error } = await supabase
    .from("call_outcomes")
    .upsert(
      {
        call_id: data.call_id,
        supervisor_requested: data.supervisor_requested,
        source: data.source ?? null,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "call_id" }
    )
    .select("id, call_id, supervisor_requested, recorded_at, source")
    .single();
  if (error) throw error;
  return row as CallOutcomeRow;
}

export async function getCallOutcome(callId: string): Promise<CallOutcomeRow | null> {
  const { data, error } = await supabase
    .from("call_outcomes")
    .select("id, call_id, supervisor_requested, recorded_at, source")
    .eq("call_id", callId)
    .maybeSingle();
  if (error) throw error;
  return data as CallOutcomeRow | null;
}
