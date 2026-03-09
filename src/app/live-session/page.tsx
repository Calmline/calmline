"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStatus } from "@/context/AppStatusContext";

type CustomerProfile = {
  id: string;
  phone_number: string | null;
  email: string | null;
  total_calls: number | null;
  total_escalations: number | null;
  common_issues: string | null;
  last_interaction: string | null;
  created_at: string;
};

function LiveIndicatorBar({
  status,
  tone,
  risk,
}: {
  status: string;
  tone: string;
  risk: string;
}) {
  return (
    <div className="mb-6 flex w-full items-center justify-between rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "Connected" || status === "Listening" ? "animate-pulse bg-[#22C7C9]" : "bg-slate-300"
            }`}
          />
          <span className="text-sm font-medium" style={{ color: "#1E293B" }}>
            {status}
          </span>
        </div>
        <div className="text-sm" style={{ color: "#64748B" }}>
          Tone: <span className="font-medium" style={{ color: "#1E293B" }}>{tone}</span>
        </div>
        <div className="text-sm" style={{ color: "#64748B" }}>
          Escalation Risk: <span className="font-medium" style={{ color: "#1E293B" }}>{risk}</span>
        </div>
      </div>
      <div className="text-sm" style={{ color: "#64748B" }}>
        Calmline AI monitoring conversation
      </div>
    </div>
  );
}

function CustomerInsight({
  phoneNumber,
  profile,
  loading,
  error,
}: {
  phoneNumber: string | null;
  profile: CustomerProfile | null;
  loading: boolean;
  error: string | null;
}) {
  const previousCalls =
    profile && typeof profile.total_calls === "number"
      ? Math.max(0, profile.total_calls - 1)
      : 0;
  const totalEscalations = profile?.total_escalations ?? 0;
  const commonIssue =
    (profile?.common_issues && profile.common_issues.trim()) || "Not enough data yet.";

  let lastInteractionLabel = "No previous interactions";
  if (profile?.last_interaction) {
    const raw = profile.last_interaction;
    const ts = Date.parse(raw);
    if (!Number.isNaN(ts)) {
      lastInteractionLabel = new Date(ts).toLocaleString();
    } else {
      lastInteractionLabel = raw;
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)] mb-4">
      <h2 className="mb-3 text-base font-semibold" style={{ color: "#1E293B" }}>
        Customer Insight
      </h2>
      {!phoneNumber ? (
        <p className="text-sm" style={{ color: "#64748B" }}>
          Waiting for caller details…
        </p>
      ) : loading ? (
        <p className="text-sm" style={{ color: "#64748B" }}>
          Loading customer history…
        </p>
      ) : error ? (
        <p className="text-sm" style={{ color: "#B91C1C" }}>
          {error}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748B" }}>
              Caller Phone Number
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: "#1E293B" }}>
              {phoneNumber}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748B" }}>
              Previous Calls
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: "#1E293B" }}>
              {previousCalls}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748B" }}>
              Total Escalations
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: "#1E293B" }}>
              {totalEscalations}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748B" }}>
              Common Issue
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: "#1E293B" }}>
              {commonIssue}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#64748B" }}>
              Last Interaction
            </p>
            <p className="mt-1 text-sm font-medium" style={{ color: "#1E293B" }}>
              {lastInteractionLabel}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveSessionPage() {
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [coachText, setCoachText] = useState("");
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
  const [riskSignals, setRiskSignals] = useState<string[]>([]);
  const [conversationState, setConversationState] = useState<string | null>(null);
  const [toneAnalysis, setToneAnalysis] = useState<string | null>(null);
  const [callTone, setCallTone] = useState("Neutral");
  const [risk, setRisk] = useState("Low");
  const [aiThinking, setAiThinking] = useState(false);
  const [highlightNewResponse, setHighlightNewResponse] = useState(false);
  const [responseLocked, setResponseLocked] = useState(false);
  const [coachStatus, setCoachStatus] = useState("Listening");
  const responseLockedRef = useRef(false);
  const lastResponseTimeRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sessionStartedRef = useRef(false);
  const { setConnection, setSession, connection, session } = useAppStatus();

  type SessionPhase = "idle" | "armed" | "active" | "ended";
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle");
  const [sessionTranscript, setSessionTranscript] = useState<string[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callerNumber, setCallerNumber] = useState<string | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const isActiveCall = sessionPhase === "active";
  const sessionStatusDisplay =
    sessionPhase === "idle"
      ? "Ready to start session"
      : sessionPhase === "armed"
        ? "Waiting for live call…"
        : sessionPhase === "active"
          ? "Call in progress"
          : "Session ended";
  const statusDisplay =
    sessionPhase === "active"
      ? "Connected"
      : sessionPhase === "armed"
        ? "Connecting..."
        : "Ended";

  const ensureCustomerProfile = useCallback(async (phone: string) => {
    try {
      setCustomerLoading(true);
      setCustomerError(null);
      const res = await fetch("/api/customer-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      const data = (await res.json()) as CustomerProfile;
      setCustomerProfile(data);
    } catch (err) {
      console.error("[live-session] customer profile error", err);
      setCustomerError(
        err instanceof Error
          ? err.message
          : "Failed to load customer profile",
      );
    } finally {
      setCustomerLoading(false);
    }
  }, []);

  const startSession = useCallback(() => {
    setTranscriptLines([]);
    setSessionTranscript([]);
    setAiResponses([]);
    setCoachText("");
    setAiThinking(false);
    setCoachStatus("Listening");
    responseLockedRef.current = false;
    setResponseLocked(false);
    lastResponseTimeRef.current = 0;
    setRiskLevel(null);
    setRiskSignals([]);
    setConversationState(null);
    sessionStartedRef.current = true;
    setCallerNumber(null);
    setCustomerProfile(null);
    setCustomerError(null);
    setSessionStartTime(Date.now());
    setSessionId(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`);
    setSessionPhase("armed");
    setConnection("connecting");
    setSession("listening");
  }, [setSession, setConnection]);

  const endSession = useCallback(async () => {
    sessionStartedRef.current = false;

    const duration =
      sessionStartTime != null ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const transcript = sessionTranscript.length > 0 ? sessionTranscript.join("\n") : transcriptLines.join("\n");
    const aiResponse = aiResponses.join("\n");
    const tone = conversationState || callTone;
    const escalationRisk = riskLevel || risk;

    try {
      await fetch("/api/call-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          transcript,
          ai_response: aiResponse,
          tone,
          escalation_risk: escalationRisk,
          call_duration: duration,
          ended_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error("[live-session] failed to save call history:", err);
    }

    setSessionTranscript([]);
    setTranscriptLines([]);
    setAiResponses([]);
    setCoachText("");
    setAiThinking(false);
    setSessionStartTime(null);
    setSessionId(null);
    setCallerNumber(null);
    setCustomerProfile(null);
    setCustomerError(null);
    setSessionPhase("ended");
    setConnection("disconnected");
    setSession("idle");
  }, [
    setSession,
    setConnection,
    sessionStartTime,
    sessionTranscript,
    transcriptLines,
    aiResponses,
    conversationState,
    callTone,
    riskLevel,
    risk,
    sessionId,
  ]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8787/ui");

    socket.onopen = () => {
      console.log("Connected to realtime gateway");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WS message:", data);

      if (data.type === "call_state") {
        setSessionPhase("active");
        setConnection("connected");
        if (typeof data.from === "string" && data.from.trim().length > 0) {
          setCallerNumber((prev) => prev ?? data.from);
        }
      }

      if (data.type === "transcript" && data.text) {
        const line = typeof data.text === "string" ? data.text : String(data.text);
        setTranscriptLines((prev) => [...prev, line]);
        setSessionTranscript((prev) => [...prev, line]);
      }

      if (data.type === "conversation_state") {
        if (data.transcript && Array.isArray(data.transcript)) {
          setTranscriptLines(data.transcript);
          setSessionTranscript(data.transcript);
        }
      }

      if (data.type === "coach_final" || data.type === "coach") {
        const text = data.message || data.text;
        if (text) {
          const response = typeof text === "string" ? text : String(text);
          setCoachText(response);
          setAiResponses((prev) => [...prev, response]);
        }
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => socket.close();
  }, []);

  useEffect(() => {
    if (!callerNumber) return;
    void ensureCustomerProfile(callerNumber);
  }, [callerNumber, ensureCustomerProfile]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptLines]);

  return (
    <div className="space-y-6 p-6 -m-8 -mb-0" style={{ background: "#F7F9FB", minHeight: "100vh" }}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "#1E293B" }}>Live Session</h1>
        {sessionPhase === "armed" && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: "rgba(245,158,11,0.15)", color: "#B45309" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#F59E0B" }}
            />
            Connecting...
          </span>
        )}
        {sessionPhase === "active" && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ background: "rgba(34,199,201,0.15)", color: "#0F766E" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: "#22C7C9" }}
            />
            Connected
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
          <button
            onClick={startSession}
            className="rounded-lg px-[18px] py-2.5 font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:ring-offset-2"
            style={{ background: "#0F766E" }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#0B5E58";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#0F766E";
            }}
          >
            Start Live Session
          </button>
          <button
            onClick={endSession}
            className="rounded-lg px-[18px] py-2.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            style={{ background: "#E5E7EB", color: "#1E293B" }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#D1D5DB";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#E5E7EB";
            }}
          >
            End Session
          </button>
        </div>
        <div className="text-sm" style={{ color: "#64748B" }}>{sessionStatusDisplay}</div>
      </div>

      <LiveIndicatorBar
        status={statusDisplay}
        tone={isActiveCall ? (conversationState || callTone) : "-"}
        risk={isActiveCall ? (riskLevel || risk) : "-"}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CustomerInsight
            phoneNumber={callerNumber}
            profile={customerProfile}
            loading={customerLoading}
            error={customerError}
          />
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold" style={{ color: "#1E293B" }}>
              Conversation Transcript
            </h2>
            <div
              ref={transcriptRef}
              className="h-96 overflow-y-auto rounded-lg border border-[#E2E8F0] p-4 scroll-smooth text-sm transcript-panel"
              style={{ color: "#1E293B" }}
            >
              {transcriptLines.length === 0 ? (
                <p style={{ color: "#64748B" }}>
                  {sessionPhase === "idle"
                    ? "Start a live session to begin transcription."
                    : sessionPhase === "armed"
                      ? "Waiting for live call…"
                      : sessionPhase === "ended"
                        ? "Session ended. Start a new session to continue."
                        : connection === "connected"
                          ? "Listening for conversation…"
                          : "Connect to the gateway to see the transcript."}
                </p>
              ) : (
                <div className="transcript-box">
                  {transcriptLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-slate-400 rounded"></div>
            <h3 className="text-slate-700 text-base font-semibold tracking-normal">
              Suggested Response
            </h3>
          </div>
          <div
            className={`min-h-96 flex flex-col rounded-lg p-1 transition-all duration-300 ${highlightNewResponse ? "bg-slate-50" : ""}`}
          >
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              AI Suggested Response
            </div>
            <div className="flex-1 flex items-center justify-center overflow-y-auto">
              {sessionPhase === "ended" || sessionPhase === "idle" ? null : coachText ? (
                <p
                  className="text-center w-full"
                  style={{ fontSize: "22px", lineHeight: 1.6, fontWeight: 500, color: "#1E293B" }}
                >
                  &ldquo;{coachText}&rdquo;
                </p>
              ) : aiThinking ? (
                <p style={{ color: "#94A3B8", fontSize: "18px" }}>
                  AI analyzing conversation...
                  <span className="ml-2 animate-pulse">...</span>
                </p>
              ) : (
                <p style={{ color: "#94A3B8", fontSize: "18px" }}>
                  AI is listening to the conversation...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="mb-3 text-base font-semibold" style={{ color: "#1E293B" }}>
            Risk Overview
          </h2>
          <div className="space-y-2">
            <p
              className="text-lg font-medium"
              style={{
                color:
                  riskLevel === "HIGH"
                    ? "#B91C1C"
                    : riskLevel === "MEDIUM"
                      ? "#B45309"
                      : riskLevel === "LOW"
                        ? "#0F766E"
                        : "#64748B",
              }}
            >
              {riskLevel ?? "—"}
            </p>
            {riskSignals.length > 0 && (
              <ul className="list-inside list-disc text-sm" style={{ color: "#64748B" }}>
                {riskSignals.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            {!riskLevel && (
              <p className="text-sm" style={{ color: "#64748B" }}>
                Escalation risk will update as the call progresses.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
          <h2 className="mb-3 text-base font-semibold" style={{ color: "#1E293B" }}>
            Tone Analysis
          </h2>
          <p style={{ color: "#1E293B" }}>
            {conversationState
              ? `Conversation state: ${conversationState}`
              : toneAnalysis ?? "Tone analysis will appear as the call progresses."}
          </p>
        </div>
      </div>
    </div>
  );
}
