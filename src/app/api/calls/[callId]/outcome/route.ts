import { NextResponse } from "next/server";
import { upsertCallOutcome, getCallOutcome, type CallOutcomeSource } from "@/lib/supabase";

const VALID_SOURCES: CallOutcomeSource[] = ["manual", "crm", "integration", "twilio"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const trimmed = callId?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const supervisor_requested = body.supervisor_requested;
    if (typeof supervisor_requested !== "boolean") {
      return NextResponse.json(
        { error: "supervisor_requested (boolean) is required" },
        { status: 400 }
      );
    }

    const source =
      typeof body.source === "string" && VALID_SOURCES.includes(body.source as CallOutcomeSource)
        ? (body.source as CallOutcomeSource)
        : undefined;

    const row = await upsertCallOutcome({
      call_id: trimmed,
      supervisor_requested,
      source: source ?? undefined,
    });

    return NextResponse.json({
      call_id: row.call_id,
      supervisor_requested: row.supervisor_requested,
      recorded_at: row.recorded_at,
      source: row.source,
    });
  } catch (err) {
    console.error("Record outcome error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record outcome" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const trimmed = callId?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    const outcome = await getCallOutcome(trimmed);
    if (!outcome) {
      return NextResponse.json({ outcome: null }, { status: 200 });
    }
    return NextResponse.json({
      outcome: {
        call_id: outcome.call_id,
        supervisor_requested: outcome.supervisor_requested,
        recorded_at: outcome.recorded_at,
        source: outcome.source,
      },
    });
  } catch (err) {
    console.error("Get outcome error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get outcome" },
      { status: 500 }
    );
  }
}
