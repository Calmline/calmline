import { NextResponse } from "next/server";
import { getTrainingExamples } from "@/lib/trainingData";

/**
 * GET /api/training-data
 * Query: since (ISO date), limit (number), only_with_outcome (default true)
 * Returns training-ready rows: transcript segments + escalation labels + outcome.
 * For future fine-tuning; no dashboard. Backend only.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(50000, Math.max(1, parseInt(limitParam, 10))) : 5000;
    const only_with_outcome = searchParams.get("only_with_outcome") !== "false";

    const examples = await getTrainingExamples({
      since,
      limit: Number.isNaN(limit) ? 5000 : limit,
      only_with_outcome,
    });

    return NextResponse.json({
      count: examples.length,
      since: since ?? null,
      only_with_outcome,
      examples,
    });
  } catch (err) {
    console.error("Training data export error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export training data" },
      { status: 500 }
    );
  }
}
