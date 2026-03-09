import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
      .select("id, session_id, transcript, ai_response, tone, escalation_risk, created_at, ended_at, call_duration, caller_number, call_outcome, disposition_reason")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[call-history] GET error:", error.message);
      return NextResponse.json({ sessions: [] });
    }
    const sessions = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      session_id: row.session_id ?? null,
      transcript: row.transcript ?? "",
      ai_response: row.ai_response ?? "",
      tone: row.tone ?? null,
      escalation_risk: row.escalation_risk ?? null,
      created_at: row.created_at,
      ended_at: row.ended_at ?? null,
      call_duration: row.call_duration ?? null,
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
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const {
      session_id,
      transcript = "",
      ai_response = "",
      tone = null,
      escalation_risk = null,
      call_duration = null,
      ended_at = null,
      caller_number = null,
    } = body;
    const { data, error } = await supabase
      .from("call_sessions")
      .insert({
        session_id: session_id ?? null,
        transcript: String(transcript),
        ai_response: String(ai_response),
        tone: tone ?? null,
        escalation_risk: escalation_risk ?? null,
        call_duration: call_duration ?? null,
        ended_at: ended_at ?? new Date().toISOString(),
        caller_number: caller_number ?? null,
      })
      .select("id, created_at")
      .single();
    if (error) {
      console.error("[call-history] POST error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: data?.id, created_at: data?.created_at });
  } catch (err) {
    console.error("[call-history] POST exception:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
