import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ sessions: [] });
  }
  try {
    const { data, error } = await supabase
      .from("call_sessions")
      .select("id, session_id, duration_seconds, escalation_risk, conversation_state, transcript, created_at, ai_response, ended_at, caller_number, call_outcome, disposition_reason")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[call-history] GET error:", error.message);
      return NextResponse.json({ sessions: [] });
    }
    const sessions = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      session_id: row.session_id ?? row.id ?? null,
      transcript: row.transcript ?? "",
      ai_response: row.ai_response ?? "",
      tone: row.conversation_state ?? row.tone ?? null,
      escalation_risk: row.escalation_risk ?? null,
      created_at: row.created_at,
      ended_at: row.ended_at ?? null,
      call_duration: row.duration_seconds ?? row.call_duration ?? null,
      caller_number: row.caller_number ?? null,
      call_outcome: row.call_outcome ?? null,
      disposition_reason: row.disposition_reason ?? null,
    }));
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error("[call-history] GET exception:", err);
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(request: Request) {
  console.log("[call-history] POST received");
  const supabase = getSupabase();
  if (!supabase) {
    console.error("[call-history] POST skipped: Supabase not configured");
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const {
      session_id = null,
      transcript = "",
      ai_response = "",
      tone = null,
      escalation_risk = null,
      call_duration = null,
      ended_at = null,
      caller_number = null,
      call_outcome = null,
      disposition_reason = null,
    } = body;
    console.log("[call-history] POST body keys", {
      session_id: session_id != null,
      transcriptLen: String(transcript).length,
      ai_responseLen: String(ai_response).length,
      call_duration,
      ended_at: ended_at != null,
    });
    const { data, error } = await supabase
      .from("call_sessions")
      .insert({
        session_id: session_id ?? null,
        transcript: String(transcript),
        ai_response: String(ai_response),
        escalation_risk: escalation_risk ?? null,
        conversation_state: tone ?? null,
        duration_seconds: call_duration != null ? Number(call_duration) : null,
        ended_at: ended_at ?? null,
        caller_number: caller_number ?? null,
        call_outcome: call_outcome ?? null,
        disposition_reason: disposition_reason ?? null,
      })
      .select("id, created_at")
      .single();
    if (error) {
      console.error("[call-history] POST insert error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.log("[call-history] POST success", { id: data?.id, created_at: data?.created_at });
    return NextResponse.json({ ok: true, id: data?.id, created_at: data?.created_at });
  } catch (err) {
    console.error("[call-history] POST exception:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
