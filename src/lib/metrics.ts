/**
 * In-memory performance metrics for AI analysis pipeline.
 * Used by the System Health endpoint. Resets on process restart.
 */

const MAX_SAMPLES = 500;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

type Sample = {
  ts: number;
  success: boolean;
  aiResponseTimeMs: number;
  roundTripMs: number;
  streamingDelayMs: number | null;
};

const samples: Sample[] = [];

function prune() {
  const cutoff = Date.now() - WINDOW_MS;
  while (samples.length > 0 && samples[0].ts < cutoff) {
    samples.shift();
  }
  while (samples.length > MAX_SAMPLES) {
    samples.shift();
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)] ?? 0;
}

function stats(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, p95: 0, count: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    avg: Math.round((sum / values.length) * 100) / 100,
    p95: Math.round(percentile(sorted, 95) * 100) / 100,
    count: values.length,
  };
}

export function recordAnalyzeRequest(opts: {
  success: boolean;
  aiResponseTimeMs: number;
  roundTripMs: number;
  streamingDelayMs?: number | null;
}) {
  const { success, aiResponseTimeMs, roundTripMs, streamingDelayMs = null } = opts;
  samples.push({
    ts: Date.now(),
    success,
    aiResponseTimeMs,
    roundTripMs,
    streamingDelayMs: streamingDelayMs ?? null,
  });
  prune();
}

export function getHealthSnapshot(): {
  aiResponseTime: { min: number; max: number; avg: number; p95: number; count: number };
  streamingTranscriptionDelay: { min: number; max: number; avg: number; p95: number; count: number };
  roundTripLatency: { min: number; max: number; avg: number; p95: number; count: number };
  failureRate: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  windowMs: number;
} {
  prune();
  const total = samples.length;
  const successSamples = samples.filter((s) => s.success);
  const failureCount = total - successSamples.length;
  const aiTimes = successSamples.map((s) => s.aiResponseTimeMs);
  const roundTrips = samples.map((s) => s.roundTripMs);
  const streamingDelays = samples
    .filter((s) => s.streamingDelayMs != null)
    .map((s) => s.streamingDelayMs as number);

  return {
    aiResponseTime: stats(aiTimes),
    streamingTranscriptionDelay: stats(streamingDelays),
    roundTripLatency: stats(roundTrips),
    failureRate: total === 0 ? 0 : Math.round((failureCount / total) * 10000) / 10000,
    totalRequests: total,
    successCount: successSamples.length,
    failureCount,
    windowMs: WINDOW_MS,
  };
}
