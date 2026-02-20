import { NextResponse } from "next/server";
import { buildEscalationDataset } from "@/lib/aggregate-escalations";

/**
 * GET /api/escalation-dataset
 * Returns structured JSON summary of escalation pattern frequency
 * (proprietary escalation dataset).
 *
 * Query params:
 * - since: ISO date string, only include call_events on or after this date
 * - limit: max events to aggregate (default 10000)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(50_000, Math.max(1, parseInt(limitParam, 10))) : undefined;

    const summary = await buildEscalationDataset({ since, limit });
    return NextResponse.json(summary, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("Escalation dataset error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build escalation dataset" },
      { status: 500 }
    );
  }
}
