/**
 * Fine-tuning data shape: transcript segments + escalation labels + outcome.
 * Used for future model training; no dashboard. Backend data capture only.
 */

import { supabase, type CallEventRow } from "@/lib/supabase";

/** One training example: a segment with its escalation labels and call outcome. */
export type TrainingExample = {
  /** Unique id for this segment row */
  event_id: string;
  call_id: string;
  timestamp: string;
  /** Transcript segment text */
  transcript_segment: string;
  speaker: string | null;
  /** Escalation labels from analysis */
  escalation_level: string;
  escalation_risk: number;
  complaint_risk: number;
  urgency_level: string;
  detected_triggers: string[];
  suggested_script: string | null;
  tactical_guidance: string | null;
  /** Outcome: was a supervisor requested on this call? (null if not yet recorded) */
  supervisor_requested: boolean | null;
  outcome_recorded_at: string | null;
};

export type TrainingDataOptions = {
  /** Only include calls that have an outcome recorded (recommended for fine-tuning). */
  only_with_outcome?: boolean;
  /** Fetch events since this ISO date. */
  since?: string;
  /** Max number of segment rows to return. */
  limit?: number;
  /** Optional: specific call ids to include. */
  call_ids?: string[];
};

/**
 * Fetch training-ready data: call_events joined with call_outcomes.
 * Returns transcript segments with escalation labels and outcome per call.
 */
export async function getTrainingExamples(
  options: TrainingDataOptions = {}
): Promise<TrainingExample[]> {
  const { only_with_outcome = true, since, limit = 5000, call_ids } = options;

  let eventsQuery = supabase
    .from("call_events")
    .select(
      "id, call_id, timestamp, speaker, transcript_segment, rolling_escalation_risk, rolling_complaint_risk, detected_triggers, suggested_script, tactical_guidance, escalation_level, urgency_level"
    )
    .order("timestamp", { ascending: true });

  if (since) eventsQuery = eventsQuery.gte("timestamp", since);
  if (limit) eventsQuery = eventsQuery.limit(limit);
  if (call_ids?.length) eventsQuery = eventsQuery.in("call_id", call_ids);

  const { data: events, error: eventsError } = await eventsQuery;
  if (eventsError) throw eventsError;
  const eventList = (events ?? []) as CallEventRow[];

  const uniqueCallIds = [...new Set(eventList.map((e) => e.call_id))];
  const outcomesMap = new Map<string, { supervisor_requested: boolean; recorded_at: string }>();

  if (uniqueCallIds.length > 0) {
    const { data: outcomes, error: outcomesError } = await supabase
      .from("call_outcomes")
      .select("call_id, supervisor_requested, recorded_at")
      .in("call_id", uniqueCallIds);
    if (outcomesError) throw outcomesError;
    for (const o of outcomes ?? []) {
      outcomesMap.set(o.call_id, {
        supervisor_requested: o.supervisor_requested,
        recorded_at: o.recorded_at,
      });
    }
  }

  const examples: TrainingExample[] = [];
  for (const e of eventList) {
    const outcome = outcomesMap.get(e.call_id);
    if (only_with_outcome && !outcome) continue;

    examples.push({
      event_id: e.id,
      call_id: e.call_id,
      timestamp: e.timestamp,
      transcript_segment: e.transcript_segment,
      speaker: e.speaker ?? null,
      escalation_level: e.escalation_level,
      escalation_risk: e.rolling_escalation_risk,
      complaint_risk: e.rolling_complaint_risk,
      urgency_level: e.urgency_level,
      detected_triggers: e.detected_triggers ?? [],
      suggested_script: e.suggested_script ?? null,
      tactical_guidance: e.tactical_guidance ?? null,
      supervisor_requested: outcome?.supervisor_requested ?? null,
      outcome_recorded_at: outcome?.recorded_at ?? null,
    });
  }

  return examples;
}
