"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useAppStatus } from "@/context/AppStatusContext";
import { useRole } from "@/context/RoleContext";
import { Card } from "@/components/ui/Card";

type PrecallBrief = {
  type: "precall_brief";
  risk?: string;
  context?: string;
  waitTime?: string;
  opening?: string;
};

type PrecallOverlayData = {
  from?: string;
  risk?: string;
  summary?: string;
  opening?: string;
};

type TransferBriefData = {
  phone: string;
  agent: string;
  summary: string;
  escalation_level: string;
};

function formatTransferCallerLine(caller: string | undefined): string {
  const raw = caller?.trim() ?? "";
  if (raw.length === 0) return "—";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

/** Safe stub — customer profile UI removed; satisfies any leftover reference without crashing. */
function ensureCustomerProfile(_phone?: string): null {
  return null;
}

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
    <div
      className="mb-6 flex w-full items-center justify-between rounded-full border"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        padding: "6px 12px",
        boxShadow: "none",
      }}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "Connected" || status === "Listening" ? "animate-pulse bg-[#22C7C9]" : "bg-slate-300"
            }`}
          />
          <span className="text-xs font-medium" style={{ color: "#9FB3C8" }}>
            {status}
          </span>
        </div>
        <div className="text-xs" style={{ color: "#6B859F" }}>
          Tone: <span className="font-medium" style={{ color: "#9FB3C8" }}>{tone}</span>
        </div>
        <div className="text-xs" style={{ color: "#6B859F" }}>
          Escalation Risk: <span className="font-medium" style={{ color: "#9FB3C8" }}>{risk}</span>
        </div>
      </div>
      <div className="text-xs" style={{ color: "#6B859F" }}>
        CalmLine AI monitoring conversation
      </div>
    </div>
  );
}

function transcriptSpeakerRole(line: string, index: number): "customer" | "agent" {
  const t = line.trim();
  const lower = t.toLowerCase();
  if (
    /^(customer|caller|user)[\s:]/i.test(t) ||
    lower.startsWith("customer:") ||
    lower.startsWith("caller:")
  ) {
    return "customer";
  }
  if (
    /^(agent|support|representative|rep)[\s:]/i.test(t) ||
    lower.startsWith("agent:") ||
    lower.startsWith("support:")
  ) {
    return "agent";
  }
  return index % 2 === 0 ? "customer" : "agent";
}

function stripTranscriptSpeakerPrefix(line: string): string {
  return line.replace(/^\s*(customer|caller|agent|support|user|representative|rep)\s*:\s*/i, "").trim() || line;
}

export default function LiveSessionPage() {
  const { role, setRoleAndPersist } = useRole();
  const [preCallData, setPreCallData] = useState(null as any);
  const [callActive, setCallActive] = useState(false);
  const [precall, setPrecall] = useState<PrecallBrief | null>(null);
  const [precallData, setPrecallData] = useState<PrecallOverlayData | null>(null);
  const [transferData, setTransferData] =
    useState<TransferBriefData | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [coachText, setCoachText] = useState("");
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
  const [riskSignals, setRiskSignals] = useState<string[]>([]);
  const [conversationState, setConversationState] = useState<string | null>(null);
  const [toneAnalysis, setToneAnalysis] = useState<string | null>(null);
  const [callTone, setCallTone] = useState("Neutral");
  const [risk, setRisk] = useState("Low");
  const [aiThinking, setAiThinking] = useState(false);
  const [responseLocked, setResponseLocked] = useState(false);
  const [coachStatus, setCoachStatus] = useState("Listening");
  const responseLockedRef = useRef(false);
  const lastResponseTimeRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const prevTranscriptLenRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const [listeningPulse, setListeningPulse] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [callTicker, setCallTicker] = useState(0);
  const { setConnection, setSession, connection, session } = useAppStatus();

  type SessionPhase = "idle" | "armed" | "active" | "ended";
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle");
  const [sessionTranscript, setSessionTranscript] = useState<string[]>([]);
  const [aiResponses, setAiResponses] = useState<string[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callerNumber, setCallerNumber] = useState<string | null>(null);
  const isActiveCall = sessionPhase === "active";

  useEffect(() => {
    if (sessionPhase !== "active" || sessionStartTime == null) return;
    const id = window.setInterval(() => setCallTicker((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [sessionPhase, sessionStartTime]);

  const elapsedLabel = useMemo(() => {
    if (sessionStartTime == null) return "0 min 00 sec";
    const sec = Math.floor((Date.now() - sessionStartTime) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} min ${String(s).padStart(2, "0")} sec`;
  }, [sessionStartTime, callTicker]);

  const callStatusPrimary =
    sessionPhase === "active"
      ? `Call in progress • ${elapsedLabel}`
      : sessionPhase === "armed"
        ? "Connecting to call…"
        : "No active call";

  const displayCaller = useMemo(() => {
    const fromPrecall = (preCallData as { caller?: string } | null)?.caller;
    const raw = callerNumber ?? fromPrecall ?? "+1 (619) 555-0147";
    return formatTransferCallerLine(raw);
  }, [callerNumber, preCallData]);

  const showHighRiskBadge = useMemo(() => {
    const a = (riskLevel ?? "").toString().toUpperCase();
    const b = (risk ?? "").toString().toUpperCase();
    return a === "HIGH" || b === "HIGH";
  }, [riskLevel, risk]);

  /** Single Pre-Call Armor view — merge brief + overlay so only one card renders (no stacking). */
  const preCallArmorView = useMemo(() => {
    if (!precall && !precallData) return null;
    const riskSource = (precallData?.risk ?? precall?.risk ?? "").trim();
    const isHigh = /high/i.test(riskSource);
    const mainRisk = isHigh ? "High Risk" : "Low Risk";
    const subtext =
      (precallData?.summary && precallData.summary.trim()) ||
      (precall?.context && precall.context.trim()) ||
      "";
    const waitRaw = precall?.waitTime?.trim() ?? "";
    const waitLabel =
      waitRaw.length > 0
        ? waitRaw.toLowerCase().startsWith("wait")
          ? waitRaw
          : `Wait: ${waitRaw}`
        : null;
    const opening =
      (precallData?.opening && precallData.opening.trim()) ||
      (precall?.opening && precall.opening.trim()) ||
      "";
    return { mainRisk, subtext, waitLabel, opening };
  }, [precall, precallData]);

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
        : sessionPhase === "idle"
          ? "Ready"
          : "Ended";

  const startSession = useCallback(() => {
    setCallActive(true);
    setPrecall(null);
    setPrecallData(null);
    setTransferData(null);
    setRoleAndPersist("agent");
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
    setSessionStartTime(Date.now());
    setSessionId(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`);
    setSessionPhase("armed");
    setConnection("connecting");
    setSession("listening");
    setPreCallData({
      caller: "+1 (619) 555-0147",
      name: "Repeat Caller",
      lastIssue: "Billing dispute — not resolved",
      contacts30d: 4,
      escalation: "HIGH",
      note: "Customer has called multiple times and is likely frustrated",
    });
  }, [setSession, setConnection, setRoleAndPersist]);

  const endSession = useCallback(async () => {
    sessionStartedRef.current = false;

    const duration =
      sessionStartTime != null ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    const transcript = sessionTranscript.length > 0 ? sessionTranscript.join("\n") : transcriptLines.join("\n");
    const aiResponse = aiResponses.join("\n");
    const tone = conversationState || callTone;
    const escalationRisk = riskLevel || risk;

    const payload = {
      session_id: sessionId,
      transcript,
      ai_response: aiResponse,
      tone,
      escalation_risk: escalationRisk,
      call_duration: duration,
      ended_at: new Date().toISOString(),
      ...(callerNumber != null && callerNumber.trim() !== "" ? { caller_number: callerNumber.trim() } : {}),
    };
    console.log("[live-session] End Session: sending POST /api/call-history", {
      session_id: payload.session_id,
      transcriptLen: payload.transcript.length,
      ai_responseLen: payload.ai_response.length,
      call_duration: payload.call_duration,
    });
    try {
      const res = await fetch("/api/call-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = (errBody as { error?: string }).error ?? res.statusText ?? `HTTP ${res.status}`;
        console.error("[live-session] save failed:", res.status, errMsg, errBody);
        return;
      }
    } catch (err) {
      console.error("[live-session] failed to save call history:", err);
      return;
    }

    setSessionTranscript([]);
    setTranscriptLines([]);
    setAiResponses([]);
    setCoachText("");
    setAiThinking(false);
    setSessionStartTime(null);
    setSessionId(null);
    setCallerNumber(null);
    setSessionPhase("ended");
    setCallActive(false);
    setTransferData(null);
    setPreCallData(null);
    setRoleAndPersist("agent");
    setConnection("disconnected");
    setSession("idle");
  }, [
    setCallActive,
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
    callerNumber,
    setRoleAndPersist,
  ]);

  useEffect(() => {
    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket("ws://localhost:8787/ui");
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("[UI] connected to gateway");
    };

    socket.onmessage = (event) => {
      console.log("[UI] message:", event.data);
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(event.data as string) as Record<string, unknown>;
        console.log("[live-session] WebSocket onmessage type=", data?.type, data);
      } catch (_) {
        console.log("[live-session] WebSocket onmessage (parse failed)", event.data);
      }

      if (data.type === "call_state") {
        if (data.state === "active") {
          setCallActive(true);
          setPrecallData(null);
          setTransferData(null);
          setRoleAndPersist("agent");
        }
        setPrecall(null);
        setSessionPhase("active");
        setConnection("connected");
        if (typeof data.from === "string" && data.from.trim().length > 0) {
          setCallerNumber((prev) => {
            if (prev) return prev;
            if (typeof data?.from === "string") return data.from;
            return "";
          });
        }
      }

      if (data.type === "precall_brief") {
        const nested =
          data.data && typeof data.data === "object"
            ? (data.data as Record<string, unknown>)
            : null;
        if (nested) {
          setPrecall({
            type: "precall_brief",
            risk: typeof nested.risk === "string" ? nested.risk : undefined,
            context:
              typeof nested.context === "string" ? nested.context : undefined,
            waitTime:
              typeof nested.waitTime === "string" ? nested.waitTime : undefined,
            opening:
              typeof nested.opening === "string" ? nested.opening : undefined,
          });
        } else {
          setPrecall(data as PrecallBrief);
        }
      }

      if (data.type === "precall") {
        const payload =
          data.data && typeof data.data === "object"
            ? (data.data as PrecallOverlayData)
            : null;
        if (payload) setPrecallData(payload);
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
      console.error("[live-session] WebSocket onerror", err);
    };

    socket.onclose = (ev) => {
      console.log("[live-session] WebSocket onclose code=", ev.code, "reason=", ev.reason);
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };

    return () => {
      socket.close();
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };
  }, [setRoleAndPersist]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcriptLines]);

  useEffect(() => {
    if (transcriptLines.length > prevTranscriptLenRef.current) {
      setListeningPulse(true);
      const t = window.setTimeout(() => setListeningPulse(false), 2000);
      prevTranscriptLenRef.current = transcriptLines.length;
      return () => window.clearTimeout(t);
    }
    prevTranscriptLenRef.current = transcriptLines.length;
  }, [transcriptLines]);

  const showGeneratingStatus =
    aiThinking ||
    (sessionPhase === "active" && transcriptLines.length > 0 && !coachText);
  const showListeningStatus =
    sessionPhase === "active" && listeningPulse && !showGeneratingStatus;

  const copyScript = useCallback(async () => {
    if (!coachText.trim()) return;
    try {
      await navigator.clipboard.writeText(coachText);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      /* ignore */
    }
  }, [coachText]);

  return (
    <div className="space-y-8 -mx-6 mb-0 min-h-[calc(100vh-2rem)] bg-transparent">
      <div className="mb-4 flex items-center justify-between gap-4 px-0">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Live Session</h1>
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

      {role === "agent" && (
        <>
      <div className="live-session-dark">
      <div
        className="flex items-center justify-between"
        style={{
          borderBottom: "1px solid rgba(148, 163, 184, 0.28)",
          paddingBottom: 12,
          marginBottom: 12,
        }}
      >
        <div className="flex" style={{ gap: 12 }}>
          <button
            onClick={startSession}
            className="rounded-[10px] px-5 py-2 text-sm font-medium text-[#0B141F] shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#1FD6A6]/50 focus:ring-offset-2 focus:ring-offset-[#0B1726]"
            style={{
              background: "#1FD6A6",
              transition: "all 0.15s ease",
            }}
          >
            Start Live Session
          </button>
          <button
            onClick={endSession}
            className="rounded-[10px] px-5 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#0B1726]"
            style={{
              background: "transparent",
              color: "#E6EEF3",
              border: "1px solid rgba(255,255,255,0.1)",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            End Session
          </button>
          <div style={{ position: "relative", zIndex: 10 }}>
            {(role as "agent" | "manager" | "admin") === "manager" && (
              <button
                onClick={async () => {
                  console.log("🚀 Simulate Transfer CLICKED");

                  const payload = {
                    phone: "+16195551234",
                    agent: "Ky (Support Agent)",
                    summary: "Customer upset about billing issue, requested refund, escalation triggered",
                    escalation_level: "HIGH",
                  };

                  console.log("📦 Sending transfer payload:", payload);

                  try {
                    const res = await fetch("/api/transfer", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(payload),
                    });

                    console.log("✅ Transfer response status:", res.status);
                    if (res.ok) {
                      setTransferData(payload);
                      setRoleAndPersist("manager");
                    }
                  } catch (err) {
                    console.error("❌ Transfer failed:", err);
                  }
                }}
                className="rounded-[10px] px-5 py-2 text-sm font-medium"
                style={{
                  backgroundColor: "transparent",
                  color: "#E6EEF3",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Simulate Transfer
              </button>
            )}
          </div>
        </div>
        <div className="text-sm" style={{ color: "#9FB3C8" }}>{sessionStatusDisplay}</div>
      </div>
      <LiveIndicatorBar
        status={statusDisplay}
        tone={isActiveCall ? (conversationState || callTone) : "-"}
        risk={isActiveCall ? (riskLevel || risk) : "-"}
      />

      <div className="mb-6 flex w-full flex-wrap items-start justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 px-6 py-4 shadow-[0_0_28px_rgba(16,185,129,0.1)]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#E6EEF6]">{callStatusPrimary}</p>
          <p className="mt-1 text-sm font-medium text-[#E6EEF6]">{displayCaller}</p>
        </div>
        {showHighRiskBadge ? (
          <span className="shrink-0 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300">
            HIGH RISK
          </span>
        ) : null}
      </div>

      <div className="space-y-6">
          {(role as "agent" | "manager" | "admin") === "manager" && transferData && (
            <div>
              <div
                className="relative mb-8 max-w-xl rounded-[10px] border px-8 py-10"
                style={{
                  background: "#0F2236",
                  borderColor: "rgba(255,255,255,0.06)",
                  boxShadow: "0 10px 24px rgba(2, 6, 23, 0.35)",
                  animation: "transferFadeIn 220ms ease-out",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTransferData(null);
                    setRoleAndPersist("agent");
                  }}
                  className="absolute text-xs font-medium"
                  style={{
                    top: "1.25rem",
                    right: "1.25rem",
                    color: "#6B859F",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.6";
                  }}
                >
                  Clear
                </button>
                <div
                  className="space-y-4 pr-14 text-[15px] leading-normal"
                  style={{ color: "#9FB3C8" }}
                >
                  <div
                    className="text-[11px] font-medium uppercase tracking-[0.12em]"
                    style={{ color: "#6B859F" }}
                  >
                    Transfer Incoming
                  </div>
                  <div className="font-medium">{transferData.phone}</div>
                  {transferData.escalation_level === "HIGH" ? (
                    <div className="font-bold" style={{ color: "#F59E0B" }}>
                      High Risk
                    </div>
                  ) : null}
                  <div
                    className="border-t"
                    style={{ borderColor: "rgba(148, 163, 184, 0.28)" }}
                    aria-hidden
                  />
                  <div
                    className="my-5 border-t"
                    style={{ borderColor: "rgba(148, 163, 184, 0.35)" }}
                    aria-hidden
                  />
                  <div className="truncate" title={transferData.agent}>
                    <span className="text-xs" style={{ color: "#6B859F" }}>Handled by: </span>
                    <span className="font-semibold">{transferData.agent}</span>
                  </div>
                  <div className="truncate" title={transferData.summary}>
                    <span className="text-xs" style={{ color: "#6B859F" }}>Prior Issue: </span>
                    <span className="font-semibold">{transferData.summary}</span>
                  </div>
                  <div className="truncate" title={transferData.escalation_level}>
                    <span className="text-xs" style={{ color: "#6B859F" }}>Customer reaction: </span>
                    <span className="font-semibold">{transferData.escalation_level}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <Card className="h-full !p-8 hover:!translate-y-0 hover:!shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div className="mb-6">
                  <h2 className="text-sm font-semibold tracking-tight text-white">
                    Live transcript
                  </h2>
                  <p className="mt-1 text-sm text-white/60">Customer speaking in real time</p>
                </div>
                <div
                  ref={transcriptRef}
                  className="transcript-panel h-[min(28rem,55vh)] overflow-y-auto scroll-smooth rounded-2xl border p-4 text-sm"
                  style={{
                    borderColor: "rgba(255,255,255,0.06)",
                    background: "#060D18",
                    boxShadow: "none",
                  }}
                >
                  {transcriptLines.length === 0 ? (
                    <div
                      className="flex min-h-[20rem] flex-col items-center justify-center rounded-2xl px-5 py-10"
                      style={{ background: "rgba(0, 0, 0, 0.2)" }}
                    >
                      <p
                        className="text-center text-xs leading-relaxed"
                        style={{ color: "#6B859F", lineHeight: 1.7 }}
                      >
                        {!callActive
                          ? "No active call — start a session"
                          : connection === "connected"
                            ? "Listening for conversation…"
                            : "Connect to the gateway to see the transcript."}
                      </p>
                    </div>
                  ) : (
                    <div className="transcript-box space-y-3">
                      {transcriptLines.map((line, i) => {
                        const role = transcriptSpeakerRole(line, i);
                        const body = stripTranscriptSpeakerPrefix(line);
                        const isNew = i === transcriptLines.length - 1;
                        return (
                          <div
                            key={`${i}-${line.slice(0, 32)}`}
                            className={`flex w-full ${role === "agent" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[92%] rounded-2xl px-3 py-2.5 ${
                                role === "agent"
                                  ? "rounded-br-md border border-[#1FD6A6]/25 bg-[#0F2236]/90"
                                  : "rounded-bl-md border border-red-500/15 bg-white/[0.04]"
                              } ${isNew ? "transcript-line-new" : ""}`}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                                    role === "agent"
                                      ? "text-[#1FD6A6]"
                                      : "text-red-400/90"
                                  }`}
                                >
                                  {role === "agent" ? "You" : "Customer"}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#C8D4E0]">
                                {body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="min-h-0 min-w-0">
              <Card className="h-full !border border-teal-400/40 !bg-gradient-to-br !from-teal-500/10 !to-transparent !p-8 hover:!translate-y-0 hover:!shadow-[0_12px_32px_rgba(0,200,150,0.12)]">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1FD6A6]/90">
                      AI COACHING — LIVE
                    </p>
                    <h3 className="mt-1 font-semibold tracking-tight text-[#E6EEF3] text-lg">
                      What to Say Now
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-[#9FB3C8]">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1FD6A6]"
                      aria-hidden
                    />
                    Live
                  </div>
                </div>

                <div className="mb-4 min-h-[1.25rem] space-y-1">
                  {showGeneratingStatus ? (
                    <p className="text-xs font-medium text-teal-300/90">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                        Generating response...
                      </span>
                    </p>
                  ) : null}
                  {showListeningStatus ? (
                    <p className="text-xs font-medium text-[#9FB3C8]">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22C7C9]" />
                        Listening...
                      </span>
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-teal-400/40 bg-gradient-to-br from-teal-500/10 to-transparent p-5 shadow-[inset_0_1px_0_rgba(45,212,191,0.12)]">
                  <div className="flex min-h-[min(18rem,50vh)] flex-col justify-center overflow-y-auto">
                    {sessionPhase === "ended" || sessionPhase === "idle" ? (
                      <p className="text-center text-sm text-[#6B859F] leading-relaxed">
                        Live guidance will appear here when you&apos;re on a call.
                      </p>
                    ) : coachText ? (
                      <p className="text-center text-xl font-medium leading-relaxed text-[#E6EEF3]">
                        &ldquo;{coachText}&rdquo;
                      </p>
                    ) : aiThinking ? (
                      <p className="text-center text-sm leading-relaxed text-[#9FB3C8]">
                        AI analyzing conversation
                        <span className="ml-1 animate-pulse">...</span>
                      </p>
                    ) : (
                      <p className="text-center text-sm leading-relaxed text-[#9FB3C8]">
                        Waiting for the next coaching cue from your live transcript...
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void copyScript()}
                    disabled={!coachText.trim()}
                    className="rounded-[10px] bg-[#1FD6A6] px-5 py-2.5 text-sm font-medium text-[#0B141F] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copyFeedback ? "Copied" : "Copy Script"}
                  </button>
                  <button
                    type="button"
                    className="rounded-[10px] border border-white/[0.12] bg-transparent px-5 py-2.5 text-sm font-medium text-[#E6EEF6] transition hover:bg-white/[0.06]"
                  >
                    Regenerate
                  </button>
                </div>

                <div className="mt-6 border-t border-white/[0.08] pt-5">
                  <button
                    type="button"
                    onClick={() => setBackupOpen((o) => !o)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-[#9FB3C8] transition hover:text-[#E6EEF6]"
                  >
                    <span>Backup responses</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform ${backupOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {backupOpen ? (
                    <ul className="mt-3 space-y-3 text-sm leading-relaxed text-[#9FB3C8]">
                      <li className="rounded-lg border border-white/[0.06] bg-[#060D18]/80 p-3">
                        I understand you&apos;d like to speak to a manager. At the moment, one
                        isn&apos;t available, but I can take full ownership of resolving this for
                        you.
                      </li>
                      <li className="rounded-lg border border-white/[0.06] bg-[#060D18]/80 p-3">
                        I want to make sure this gets handled properly. Let me continue assisting you
                        so we can resolve this without delay.
                      </li>
                    </ul>
                  ) : null}
                </div>
              </Card>
            </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <Card className="h-full !rounded-2xl !border !border-white/10 !bg-gradient-to-br !from-[#0F1C2B] !via-white/[0.02] !to-[#0B1623] !p-8 hover:!translate-y-0 hover:!shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">Pre-Call Armor Brief</h3>
                </div>
                <dl className="space-y-3 text-xs text-[#9FB3C8]">
                  <div className="flex justify-between gap-2 border-b border-white/[0.05] pb-2.5">
                    <dt className="text-[#6B859F]">Caller number</dt>
                    <dd className="text-right font-medium text-[#E6EEF6]">{displayCaller}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-white/[0.05] pb-2.5">
                    <dt className="text-[#6B859F]">Contacts (last 30 days)</dt>
                    <dd className="text-right font-medium text-[#E6EEF6]">
                      {preCallData != null ? String((preCallData as any).contacts30d) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-white/[0.05] pb-2.5">
                    <dt className="text-[#6B859F]">Last issue</dt>
                    <dd className="max-w-[60%] text-right font-medium text-[#E6EEF6]">
                      {preCallData != null ? String((preCallData as any).lastIssue) : "—"}
                    </dd>
                  </div>
                  {(preCallData as any)?.note ? (
                    <div className="flex flex-col gap-1 pt-0.5">
                      <dt className="text-[#6B859F]">Notes</dt>
                      <dd>
                        <p className="text-[11px] leading-relaxed text-[#9FB3C8]">
                          {(preCallData as any).note}
                        </p>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {preCallArmorView?.subtext ? (
                  <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-[#9FB3C8]">
                    {preCallArmorView.subtext}
                  </p>
                ) : null}
              </Card>
            </div>

            <div className="min-w-0">
              <Card className="h-full !rounded-2xl !border !border-white/10 !bg-gradient-to-br !from-[#0F1C2B] !via-white/[0.02] !to-[#0B1623] !p-8 hover:!translate-y-0 hover:!shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">Agent Context</h3>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="text-sm leading-relaxed text-white/60">
                    Call metrics will appear during active sessions.
                  </p>
                  <p className="mt-3 text-sm text-white/70">Current state: —</p>
                  <p className="mt-1 text-sm text-white/70">Calls today: —</p>
                  <p className="mt-1 text-sm text-white/70">High severity: —</p>
                </div>
              </Card>
            </div>
            </div>
          </div>
      </div>
      </div>
        </>
      )}
      {role === "manager" && (
        <>
          <div className="live-session-dark">
            {transferData ? (
              <>
                <div className="transfer-banner">
                  <div>Transfer incoming — Pre-Call Armor loaded</div>
                  <div className="transfer-tag">HIGH RISK</div>
                </div>

                <div className="manager-grid">
                  <div
                    className="rounded-[10px] border p-4"
                    style={{
                      background: "#0F2236",
                      borderColor: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <h3 className="mb-3 text-base font-semibold" style={{ color: "#E6EEF3" }}>
                      Transfer Brief
                    </h3>
                    <div className="row">
                      <span className="label">Caller</span>
                      <span className="value">{transferData?.phone ?? "—"}</span>
                    </div>
                    <div className="divider" />
                    <div className="row">
                      <span className="label">Handled by</span>
                      <span className="value">{transferData?.agent ?? "—"}</span>
                    </div>
                    <div className="divider" />
                    <div className="row">
                      <span className="label">Issue</span>
                      <span className="value">{transferData?.summary ?? "—"}</span>
                    </div>
                    <div className="divider" />
                    <div className="row">
                      <span className="label">Risk</span>
                      <span className="value">{transferData?.escalation_level ?? "—"}</span>
                    </div>
                  </div>

                  <div
                    className="rounded-[10px] border p-4"
                    style={{
                      background: "#0F2236",
                      borderColor: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <h3 className="mb-3 text-base font-semibold" style={{ color: "#E6EEF3" }}>
                      Open with this
                    </h3>
                    <div className="response-box">
                      {coachText ? `“${coachText}”` : "AI is listening to the conversation..."}
                    </div>
                    <p className="mt-3 text-xs" style={{ color: "#6B859F" }}>
                      The customer does not need to repeat themselves. CalmLine already understands the
                      situation.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">Waiting for transfer...</div>
            )}
          </div>
        </>
      )}
      {role === "admin" && (
        <>
          <div className="live-session-dark">
            <h3 className="mb-4 text-base font-semibold" style={{ color: "#E6EEF3" }}>
              Policy Upload
            </h3>

            <Card className="mb-3 !py-3 text-[#9FB3C8] hover:!translate-y-0">
              Upload policy documents (PDF, DOCX)
            </Card>

            <Card className="!py-3 text-[#9FB3C8] hover:!translate-y-0">Active policies list</Card>
          </div>
        </>
      )}
      <style jsx>{`
        .live-session-dark {
          background: linear-gradient(180deg, #0b1f33 0%, #091a2a 100%);
          border-radius: 24px;
          padding: 24px;
          margin-top: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .transfer-banner {
          background: linear-gradient(90deg, #1E3A5F, #1B2F4A);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #E6EEF3;
          margin-bottom: 16px;
        }

        .transfer-tag {
          background: #C04040;
          color: white;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 999px;
        }

        .manager-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 6px 0;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 2px 0;
        }

        .label {
          color: #6B859F;
          font-size: 12px;
        }

        .value {
          color: #E6EEF3;
          font-size: 14px;
          text-align: right;
        }

        .response-box {
          background: #162A40;
          border-radius: 8px;
          padding: 16px;
          color: #E6EEF3;
          line-height: 1.6;
          border-left: 3px solid #1E6B52;
        }

        .precall-card {
          background: #0B1F33;
          border: 1px solid #1E3A5F;
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .precall-header {
          font-size: 13px;
          color: #8FAFC7;
          margin-bottom: 8px;
        }

        .precall-row {
          font-size: 14px;
          color: #E6EEF6;
          margin-bottom: 4px;
        }

        .precall-note {
          margin-top: 8px;
          font-size: 13px;
          color: #AFC6D9;
        }

        .empty-state {
          color: #6B859F;
          font-size: 14px;
          text-align: center;
          padding: 40px 0;
        }

        @keyframes transferFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <style jsx global>{`
        .transcript-line-new {
          animation: transcriptLineIn 0.45s ease-out forwards;
        }
        @keyframes transcriptLineIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
