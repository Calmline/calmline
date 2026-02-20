import { NextResponse } from "next/server";
import { analyzeTranscript, InvalidAIResponseError } from "@/lib/analyze";
import { insertCallEvent, toUrgencyLevel } from "@/lib/callEvents";
import { recordAnalyzeRequest } from "@/lib/metrics";
import { insertTranscript } from "@/lib/supabase";

function toLegacyComplaintRisk(
  level: string
): "Low" | "Medium" | "High" {
  if (level === "Moderate") return "Medium";
  if (level === "Critical") return "High";
  if (level === "High") return "High";
  return "Low";
}

export async function POST(request: Request) {
  const roundTripStartMs = Date.now();
  try {
    const body = await request.json();
    const transcript =
      typeof body.transcript === "string" ? body.transcript.trim() : "";
    const regenerate = body.regenerate === true;
    const callId = typeof body.callId === "string" ? body.callId.trim() : null;
    const speaker =
      body.speaker === "agent" || body.speaker === "customer"
        ? body.speaker
        : null;
    const transcriptionReadyAt =
      typeof body.transcriptionReadyAt === "number"
        ? body.transcriptionReadyAt
        : typeof body.transcriptionReadyAt === "string"
          ? new Date(body.transcriptionReadyAt).getTime()
          : null;

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    const aiStartMs = Date.now();
    const result = await analyzeTranscript(transcript, { regenerate });
    const aiResponseTimeMs = Date.now() - aiStartMs;
    const roundTripMs = Date.now() - roundTripStartMs;
    const streamingDelayMs =
      transcriptionReadyAt != null && !Number.isNaN(transcriptionReadyAt)
        ? Math.max(0, roundTripStartMs - transcriptionReadyAt)
        : null;

    recordAnalyzeRequest({
      success: true,
      aiResponseTimeMs,
      roundTripMs,
      streamingDelayMs,
    });

    const responseLatencyMs = roundTripMs;

    const row = await insertTranscript({
      transcript_text: transcript,
      escalation_risk: result.escalationRisk,
      complaint_risk: toLegacyComplaintRisk(result.complaintLevel),
      deescalation_response: result.suggestedResponse || null,
      tone_guidance: result.summary || null,
      twilio_call_sid: body.twilio_call_sid,
      twilio_contact_id: body.twilio_contact_id,
    });

    // Non-blocking call_event logging: never fail analysis or live coaching due to logging.
    try {
      await insertCallEvent({
        callId: callId ?? row.id,
        speaker: speaker ?? null,
        transcriptSegment: transcript,
        rollingEscalationRisk: result.escalationRisk,
        rollingComplaintRisk: result.complaintRisk,
        detectedTriggers: result.riskDrivers ?? [],
        suggestedScript: result.suggestedResponse || null,
        tacticalGuidance: result.summary || null,
        responseLatencyMs,
        escalationLevel: result.escalationLevel,
        urgencyLevel: toUrgencyLevel(result.escalationLevel),
      });
    } catch (logErr) {
      const msg = logErr instanceof Error ? logErr.message : String(logErr);
      const isMissingTable =
        /relation .* does not exist|table .* does not exist|no such table/i.test(
          msg
        );
      if (isMissingTable) {
        console.error(
          "[analyze] call_events table missing or inaccessible. Run migrations. Error:",
          msg
        );
      } else {
        console.error("[analyze] call_event insert failed (non-fatal):", logErr);
      }
      // Do not throw: return 200 and analysis so live coaching is unaffected.
    }

    return NextResponse.json({
      id: row.id,
      created_at: row.created_at,
      escalationRisk: result.escalationRisk,
      escalationLevel: result.escalationLevel,
      complaintRisk: result.complaintRisk,
      complaintLevel: result.complaintLevel,
      confidenceScore: result.confidenceScore,
      riskDrivers: result.riskDrivers,
      toneAnalysis: result.toneAnalysis,
      suggestedResponse: result.suggestedResponse,
      summary: result.summary,
      ...(result.escalationDeflectionOptions && {
        escalationDeflectionOptions: result.escalationDeflectionOptions,
      }),
    });
  } catch (err) {
    const roundTripMs = Date.now() - roundTripStartMs;
    recordAnalyzeRequest({
      success: false,
      aiResponseTimeMs: 0,
      roundTripMs,
    });
    if (err instanceof InvalidAIResponseError) {
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 422 }
      );
    }
    console.error("Analyze API error:", err);
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
