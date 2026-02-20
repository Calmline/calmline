"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TranscriptForm } from "@/components/TranscriptForm";
import { GuidancePanel } from "@/components/GuidancePanel";
import type { AnalysisData } from "@/lib/analyze";
import {
  getRollingContext,
  getLastCompleteCustomerSentence,
  hasUrgentKeywords,
  ROLLING_CUSTOMER_UTTERANCES,
} from "@/lib/liveContext";

const ANALYSIS_TARGET_LATENCY_MS = 2000;
const DEBOUNCE_MS = 400;

/** WebSocket base URL for Twilio voice stream (e.g. wss://your-domain or ws://localhost:3001). */
const WS_BASE_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001").replace(/^http/, "ws")
    : "ws://localhost:3001";

const RECONNECT_DELAYS = [1000, 2000, 4000];
const MAX_RECONNECT_ATTEMPTS = 5;

export default function LiveSessionPage() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "failed">("idle");
  const [wsRetryKey, setWsRetryKey] = useState(0);
  const transcriptRef = useRef(transcript);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnalyzedCustomerSentenceRef = useRef<string | null>(null);
  const lastAnalyzedContextRef = useRef<string>("");
  const analysisInFlightRef = useRef(false);
  const lastLatencyMsRef = useRef<number | null>(null);
  const lastEscalationRiskRef = useRef<number | null>(null);
  const callIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLiveRef = useRef(isLive);
  transcriptRef.current = transcript;
  isLiveRef.current = isLive;

  const riskLevel = result?.escalationLevel ?? null;

  const runAnalysis = useCallback(
    async (
      transcriptText: string,
      options?: {
        callId?: string | null;
        speaker?: "agent" | "customer";
        signal?: AbortSignal;
        regenerate?: boolean;
      }
    ) => {
      const start = performance.now();
      const signal = options?.signal;
      analysisInFlightRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const transcriptionReadyAt = Date.now();
        const body: Record<string, unknown> = {
          transcript: transcriptText,
          transcriptionReadyAt,
        };
        if (options?.callId) body.callId = options.callId;
        if (options?.speaker) body.speaker = options.speaker;
        if (options?.regenerate) body.regenerate = true;
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: signal ?? undefined,
        });
        if (signal?.aborted) {
          setLoading(false);
          return;
        }
        let data: unknown;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        if (signal?.aborted) {
          setLoading(false);
          return;
        }
        console.log(res.status, data);
        if (res.status === 200) {
          if (data && typeof data === "object" && data !== null) {
            const analysisData = data as AnalysisData;
            setResult(analysisData);
            lastEscalationRiskRef.current = analysisData.escalationRisk ?? null;
          }
          setError(null);
          const latencyMs = performance.now() - start;
          lastLatencyMsRef.current = latencyMs;
          console.log(
            "[Calmline] Analysis latency:",
            Math.round(latencyMs),
            "ms"
          );
          if (latencyMs > ANALYSIS_TARGET_LATENCY_MS) {
            console.warn(
              "[Calmline] Analysis exceeded",
              ANALYSIS_TARGET_LATENCY_MS,
              "ms target:",
              Math.round(latencyMs),
              "ms"
            );
          }
        } else {
          const message =
            typeof (data as { error?: string })?.error === "string"
              ? (data as { error: string }).error
              : "Analysis failed";
          setError(message);
        }
      } catch (e) {
        if (signal?.aborted || (e instanceof Error && e.name === "AbortError")) {
          setLoading(false);
          return;
        }
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
        analysisInFlightRef.current = false;
      }
    },
    []
  );

  const onStartLive = useCallback(() => {
    setError(null);
    setResult(null);
    setSessionEnded(false);
    callIdRef.current = crypto.randomUUID();
    setIsLive(true);
  }, []);

  const onStopLive = useCallback(() => {
    setIsLive(false);
    setSessionEnded(true);
  }, []);

  // Twilio Voice: connect to session WebSocket when live; receive transcript and append to state.
  useEffect(() => {
    if (!isLive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptRef.current = 0;
      setWsStatus("idle");
      return;
    }

    const url = `${WS_BASE_URL}/ws/session`;
    setWsStatus("connecting");

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          if (data.type === "transcript" && typeof data.text === "string") {
            setTranscript((prev) => {
              const next = prev.trim() ? `${prev.trim()}\n${data.text}` : data.text;
              return next;
            });
          }
        } catch {
          // ignore non-JSON or parse errors
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!isLiveRef.current) return;
        const attempt = reconnectAttemptRef.current;
        if (attempt >= MAX_RECONNECT_ATTEMPTS) {
          setWsStatus("failed");
          return;
        }
        const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        setWsStatus("reconnecting");
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          reconnectAttemptRef.current = attempt + 1;
          connect();
        }, delay);
      };

      ws.onerror = () => {
        // Close will fire after error; reconnect handled there.
      };
    }

    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isLive, wsRetryKey]);

  const onRetryWs = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setWsStatus("connecting");
    setWsRetryKey((k) => k + 1);
  }, []);

  // Debounced analysis: typing updates transcript immediately; API runs after 400ms idle.
  useEffect(() => {
    if (isLive) return;
    const trimmed = transcript.trim();
    if (!trimmed) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      runAnalysis(trimmed, { signal: abortControllerRef.current.signal });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [transcript, isLive, runAnalysis]);

  // Live mode: run coaching only when isLive === true.
  const tryRunLiveAnalysis = useCallback(() => {
    if (!isLiveRef.current || analysisInFlightRef.current) return;
    const fullTranscript = transcriptRef.current;
    const rollingContext = getRollingContext(
      fullTranscript,
      ROLLING_CUSTOMER_UTTERANCES
    );
    if (!rollingContext.trim()) return;

    const lastCompleteSentence = getLastCompleteCustomerSentence(fullTranscript);
    const sentenceTrigger =
      lastCompleteSentence != null &&
      lastCompleteSentence !== lastAnalyzedCustomerSentenceRef.current;
    const hasUrgent = hasUrgentKeywords(fullTranscript);
    const urgentTrigger =
      hasUrgent &&
      (lastAnalyzedContextRef.current === "" ||
        !hasUrgentKeywords(lastAnalyzedContextRef.current) ||
        rollingContext !== lastAnalyzedContextRef.current);

    if (!sentenceTrigger && !urgentTrigger) return;

    console.log("Running live analysis");
    analysisInFlightRef.current = true;
    setLoading(true);
    setError(null);
    runAnalysis(rollingContext, {
      callId: callIdRef.current ?? undefined,
    })
      .then(() => {
        lastAnalyzedCustomerSentenceRef.current = lastCompleteSentence;
        lastAnalyzedContextRef.current = rollingContext;
        analysisInFlightRef.current = false;
        setLoading(false);
        if (isLiveRef.current) tryRunLiveAnalysis();
      })
      .catch(() => {
        analysisInFlightRef.current = false;
        setLoading(false);
      });
  }, [runAnalysis]);

  useEffect(() => {
    console.log("isLive:", isLive);
    if (!isLive) {
      lastAnalyzedCustomerSentenceRef.current = null;
      lastAnalyzedContextRef.current = "";
      lastEscalationRiskRef.current = null;
      return;
    }
    tryRunLiveAnalysis();
  }, [isLive, transcript, tryRunLiveAnalysis]);

  const onRegenerate = useCallback(() => {
    const t = transcriptRef.current.trim();
    if (!t) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    runAnalysis(t, {
      regenerate: true,
      signal: abortControllerRef.current.signal,
    });
  }, [runAnalysis]);

  return (
    <div className="text-left">
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 sm:py-10">
        <section className="text-left">
          <p className="max-w-2xl text-lg text-neutral-600">
            Real-Time Escalation Prevention for Customer Support Teams
          </p>
        </section>

        {error && (
          <div
            className="mt-6 rounded-xl border border-red-200 bg-red-50/80 px-5 py-4 text-base text-red-800 shadow-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {isLive && wsStatus !== "idle" && (
          <div
            className="mt-6 flex items-center gap-2 rounded-xl border border-accent bg-white px-4 py-2 text-sm"
            role="status"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                wsStatus === "connected"
                  ? "bg-green-600"
                  : wsStatus === "reconnecting" || wsStatus === "connecting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-red-500"
              }`}
            />
            {wsStatus === "connected" && "Call stream connected — transcript will appear as you speak."}
            {(wsStatus === "connecting" || wsStatus === "reconnecting") && "Connecting to call stream…"}
            {wsStatus === "failed" && (
              <span className="flex items-center gap-2">
                Connection failed. Check that the WebSocket server is running.
                <button
                  type="button"
                  onClick={onRetryWs}
                  className="rounded-lg border border-charcoal bg-white px-2 py-1 text-xs font-medium text-heading hover:bg-charcoal hover:text-white"
                >
                  Retry
                </button>
              </span>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:w-[35%] lg:max-w-md lg:p-8">
            <TranscriptForm
              transcript={transcript}
              setTranscript={setTranscript}
              loading={loading}
              isLive={isLive}
              sessionEnded={sessionEnded}
              onStartLive={onStartLive}
              onStopLive={onStopLive}
              riskLevel={riskLevel}
              result={result}
              onGenerateCallSummary={transcript.trim() ? () => runAnalysis(transcript.trim()) : undefined}
              onGenerateEscalationNotes={transcript.trim() ? () => runAnalysis(transcript.trim()) : undefined}
            />
          </div>
          <div className="hidden items-center justify-center lg:flex lg:w-8 lg:shrink-0" aria-hidden>
            <span className="text-neutral-300" aria-hidden="true">
              →
            </span>
          </div>
          <div className="min-h-[320px] flex-1 lg:min-w-0">
            <GuidancePanel
              data={result}
              loading={loading}
              isLive={isLive}
              onRegenerate={transcript.trim() ? onRegenerate : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
