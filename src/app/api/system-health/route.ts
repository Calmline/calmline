import { NextResponse } from "next/server";
import { getHealthSnapshot } from "@/lib/metrics";

/**
 * Internal System Health endpoint.
 * Returns performance metrics: AI response time, streaming delay, round-trip latency, failure rates.
 */
export async function GET() {
  const snapshot = getHealthSnapshot();
  return NextResponse.json({
    ok: true,
    windowMs: snapshot.windowMs,
    metrics: {
      aiResponseTimeMs: snapshot.aiResponseTime,
      streamingTranscriptionDelayMs: snapshot.streamingTranscriptionDelay,
      roundTripLatencyMs: snapshot.roundTripLatency,
      failureRate: snapshot.failureRate,
      totalRequests: snapshot.totalRequests,
      successCount: snapshot.successCount,
      failureCount: snapshot.failureCount,
    },
  });
}
