"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useAppStatus } from "@/context/AppStatusContext";
import { useRole } from "@/context/RoleContext";

const globalForWS = globalThis as typeof globalThis & {
  __calmline_socket: WebSocket | null;
};

if (!globalForWS.__calmline_socket) {
  globalForWS.__calmline_socket = null;
}

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
    <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "Connected" || status === "Listening" ? "animate-pulse bg-teal-500" : "bg-slate-300"
            }`}
          />
          <span className="text-xs font-medium text-slate-700">{status}</span>
        </div>
        <div className="text-xs text-slate-500">
          Tone: <span className="font-medium text-slate-800">{tone}</span>
        </div>
        <div className="text-xs text-slate-500">
          Escalation risk: <span className="font-medium text-slate-800">{risk}</span>
        </div>
      </div>
      <div className="text-xs text-slate-500">CalmLine AI monitoring conversation</div>
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
  const pathname = usePathname();
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
  const [callState, setCallState] = useState<"idle" | "incoming" | "active">("idle");
  const [incomingCall, setIncomingCall] = useState<Record<string, unknown> | null>(null);
  const isActiveCall = callState === "active" || sessionPhase === "active";

  useEffect(() => {
    setCallState("idle");
    setIncomingCall(null);
    setSessionPhase("idle");
    setCallActive(false);
  }, []);

  useEffect(() => {
    let socket = globalForWS.__calmline_socket;
    if (socket && socket.readyState === WebSocket.CLOSED) {
      globalForWS.__calmline_socket = null;
      socket = null;
    }

    if (!globalForWS.__calmline_socket) {
      console.log("🚀 Creating ONE GLOBAL WebSocket");
      const s = new WebSocket("ws://127.0.0.1:8787/ui");
      globalForWS.__calmline_socket = s;
      s.onclose = () => {
        console.warn("⚠️ Socket closed");
        globalForWS.__calmline_socket = null;
      };
    } else {
      console.log("✅ Using existing global socket");
    }

    socket = globalForWS.__calmline_socket!;

    socket.onopen = () => {
      console.log("✅ GLOBAL WebSocket OPEN");
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error", err);
    };

    socket.onmessage = (event) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }
      console.log("📩 EVENT:", data);

      if (data.type === "precall_brief") {
        setCallState("incoming");
        setIncomingCall(data);
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
        setSessionPhase("armed");
        setConnection("connecting");
      }

      if (data.type === "call_started") {
        setCallState("active");
        setSessionPhase("active");
        setCallActive(true);
        setConnection("connected");
      }

      if (data.type === "call_ended") {
        setCallState("idle");
        setIncomingCall(null);
        setSessionPhase("idle");
        setCallActive(false);
        setConnection("disconnected");
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
        setCallState("active");
        setConnection("connected");
        if (typeof data.from === "string" && data.from.trim().length > 0) {
          setCallerNumber((prev) => {
            if (prev) return prev;
            if (typeof data?.from === "string") return data.from;
            return "";
          });
        }
      }

      if (data.type === "incoming_call" || data.type === "incoming-call") {
        setSessionPhase("armed");
        setCallState("incoming");
        setIncomingCall(data);
        setConnection("connecting");
        if (typeof data.phone === "string" && data.phone.trim().length > 0) {
          setCallerNumber(data.phone);
        }
        if (typeof data.from === "string" && data.from.trim().length > 0) {
          setCallerNumber(data.from);
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

    return () => {
      console.log("Skipping socket cleanup");
    };
  }, [setConnection, setRoleAndPersist]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callTicker increments each second for live clock
  }, [sessionStartTime, callTicker]);

  const callStatusPrimary =
    callState === "active"
      ? `Call in progress • ${elapsedLabel}`
      : callState === "incoming"
        ? "Incoming call…"
        : sessionPhase === "armed"
          ? "Connecting to call…"
          : "Ready";

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
    callState === "active"
      ? "Call in progress"
      : callState === "incoming"
        ? "Incoming call"
        : sessionPhase === "armed"
          ? "Waiting for live call…"
          : "Ready to start session";
  const statusDisplay =
    callState === "active"
      ? "Connected"
      : callState === "incoming"
        ? "Incoming"
        : "Ready";

  const startSession = useCallback(() => {
    setCallState("idle");
    setIncomingCall(null);
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
    setSessionPhase("idle");
    setCallActive(false);
    setCallState("idle");
    setIncomingCall(null);
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
    ((callState === "active" || sessionPhase === "active") &&
      transcriptLines.length > 0 &&
      !coachText);
  const showListeningStatus =
    (callState === "active" || sessionPhase === "active") &&
    listeningPulse &&
    !showGeneratingStatus;

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
    <div className="min-h-[calc(100vh-2rem)] space-y-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-slate-800 shadow-sm sm:px-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Live Session</h1>
            {callState === "incoming" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Incoming
              </span>
            )}
            {callState === "active" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
                Connected
              </span>
            )}
          </div>
          <p className="max-w-xl text-sm text-slate-500">
            Real-time compliance and coaching view for the active queue. Metrics below are placeholders until
            reporting is connected.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Calls</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            <p className="text-[10px] text-slate-400">Not connected</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">CSAT</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            <p className="text-[10px] text-slate-400">Not connected</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Escalations</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            <p className="text-[10px] text-slate-400">Not connected</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Calm score</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {callState === "active" ? riskLevel || risk || "—" : "—"}
            </p>
            <p className="text-[10px] text-slate-400">From live signal</p>
          </div>
        </div>
      </header>

      <nav
        className="-mx-1 flex flex-wrap gap-1 overflow-x-auto pb-1"
        aria-label="Compliance sections"
      >
        {(
          [
            { label: "Active Call", href: "/live-session", active: pathname === "/live-session" },
            { label: "Pre-Call Armor", href: "/pre-call-armor", active: pathname.startsWith("/pre-call-armor") },
            { label: "Boundary Shield", href: "/boundary-shield", active: pathname.startsWith("/boundary-shield") },
            { label: "Call History", href: "/history", active: pathname.startsWith("/history") },
            { label: "Queue", href: "/overview", active: pathname === "/overview" },
            { label: "Emotional Load", href: "/workload-signal", active: pathname.startsWith("/workload-signal") },
            { label: "Debrief", href: "/training-mode", active: pathname.startsWith("/training-mode") },
            { label: "Performance", href: "/analytics", active: pathname.startsWith("/analytics") },
            { label: "Team", href: "/organization/agents", active: pathname.startsWith("/organization/agents") },
            { label: "Audit Log", href: "/compliance/audit-log", active: pathname.startsWith("/compliance/audit-log") },
          ] as const
        ).map((tab) => (
          <Link
            key={tab.href + tab.label}
            href={tab.href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              tab.active
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {callState === "incoming" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <h3 className="text-base font-semibold text-amber-950">Incoming call</h3>
          <p className="mt-1 text-sm text-amber-900/80">
            {String(
              (typeof incomingCall?.from === "string" && incomingCall.from) ||
                (typeof incomingCall?.phone === "string" && incomingCall.phone) ||
                "—",
            )}
          </p>
        </div>
      )}

      {callState === "active" && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
          <h3 className="text-base font-semibold text-teal-950">Call in progress</h3>
        </div>
      )}

      {callState === "idle" && sessionPhase === "idle" && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          No active call
        </div>
      )}

      {role === "agent" && (
        <>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={startSession}
                    className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    Start Live Session
                  </button>
                  <button
                    type="button"
                    onClick={endSession}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
                  >
                    End Session
                  </button>
                  <div className="relative z-10">
                    {(role as "agent" | "manager" | "admin") === "manager" && (
                      <button
                        type="button"
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
                        className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                      >
                        Simulate Transfer
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-600">{sessionStatusDisplay}</div>
              </div>

              <div className="px-4 py-4">
                <LiveIndicatorBar
                  status={statusDisplay}
                  tone={isActiveCall ? (conversationState || callTone) : "-"}
                  risk={isActiveCall ? (riskLevel || risk) : "-"}
                />
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4 bg-slate-50/90 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active session</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{callStatusPrimary}</p>
                  <p className="mt-1 text-sm text-slate-700">{displayCaller}</p>
                </div>
                {showHighRiskBadge ? (
                  <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-800">
                    HIGH RISK
                  </span>
                ) : null}
              </div>

          {(role as "agent" | "manager" | "admin") === "manager" && transferData && (
            <div className="px-4 py-4">
              <div
                className="relative max-w-xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm"
                style={{ animation: "transferFadeIn 220ms ease-out" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setTransferData(null);
                    setRoleAndPersist("agent");
                  }}
                  className="absolute right-4 top-4 text-xs font-medium text-slate-500 opacity-70 transition hover:opacity-100"
                >
                  Clear
                </button>
                <div className="space-y-3 pr-12 text-sm text-slate-700">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Transfer incoming
                  </div>
                  <div className="font-semibold text-slate-900">{transferData.phone}</div>
                  {transferData.escalation_level === "HIGH" ? (
                    <div className="font-semibold text-amber-800">High risk</div>
                  ) : null}
                  <div className="border-t border-slate-200 pt-3" aria-hidden />
                  <div className="truncate text-sm" title={transferData.agent}>
                    <span className="text-slate-500">Handled by: </span>
                    <span className="font-medium text-slate-900">{transferData.agent}</span>
                  </div>
                  <div className="truncate text-sm" title={transferData.summary}>
                    <span className="text-slate-500">Prior issue: </span>
                    <span className="font-medium text-slate-900">{transferData.summary}</span>
                  </div>
                  <div className="truncate text-sm" title={transferData.escalation_level}>
                    <span className="text-slate-500">Escalation: </span>
                    <span className="font-medium text-slate-900">{transferData.escalation_level}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

              <div className="px-4 py-4">
                <div className="mb-3 border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-semibold text-slate-900">Live transcript</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Streamed in real time from the gateway</p>
                </div>
                <div
                  ref={transcriptRef}
                  className="transcript-panel h-[min(20rem,42vh)] overflow-y-auto scroll-smooth rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"
                >
                  {transcriptLines.length === 0 ? (
                    <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-lg px-4 py-8">
                      <p className="text-center text-xs leading-relaxed text-slate-500">
                        {callState === "idle" && sessionPhase === "idle"
                          ? "Start a session or wait for an incoming call."
                          : callState === "incoming"
                            ? "Call ringing — transcript will appear when the call is active."
                            : connection === "connected"
                              ? "Listening for conversation…"
                              : "Connect to the gateway to see the transcript."}
                      </p>
                    </div>
                  ) : (
                    <ul className="transcript-box divide-y divide-slate-200">
                      {transcriptLines.map((line, i) => {
                        const lineRole = transcriptSpeakerRole(line, i);
                        const body = stripTranscriptSpeakerPrefix(line);
                        const isNew = i === transcriptLines.length - 1;
                        return (
                          <li
                            key={`${i}-${line.slice(0, 32)}`}
                            className={`flex gap-3 py-3 first:pt-0 last:pb-0 ${isNew ? "transcript-line-new" : ""}`}
                          >
                            <span
                              className={`w-16 shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                lineRole === "agent" ? "text-teal-700" : "text-slate-500"
                              }`}
                            >
                              {lineRole === "agent" ? "You" : "Caller"}
                            </span>
                            <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                              {body}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800">
                      AI coaching — live
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">What to Say Now</h3>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" aria-hidden />
                    Live
                  </div>
                </div>

                <div className="mb-3 min-h-[1.25rem] space-y-1">
                  {showGeneratingStatus ? (
                    <p className="text-xs font-medium text-amber-800">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                        Generating response...
                      </span>
                    </p>
                  ) : null}
                  {showListeningStatus ? (
                    <p className="text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
                        Listening...
                      </span>
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-teal-200/80 bg-white p-6 shadow-sm ring-1 ring-teal-900/5">
                  <div className="flex min-h-[min(16rem,38vh)] flex-col justify-center overflow-y-auto">
                    {callState !== "active" ? (
                      <p className="text-center text-sm leading-relaxed text-slate-500">
                        Live guidance will appear here when you&apos;re on a call.
                      </p>
                    ) : coachText ? (
                      <p className="text-center text-2xl font-semibold leading-relaxed text-slate-900">
                        &ldquo;{coachText}&rdquo;
                      </p>
                    ) : aiThinking ? (
                      <p className="text-center text-sm leading-relaxed text-slate-600">
                        AI analyzing conversation
                        <span className="ml-1 animate-pulse">...</span>
                      </p>
                    ) : (
                      <p className="text-center text-sm leading-relaxed text-slate-600">
                        Waiting for the next coaching cue from your live transcript...
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void copyScript()}
                    disabled={!coachText.trim()}
                    className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {copyFeedback ? "Copied" : "Copy Script"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                  >
                    Regenerate
                  </button>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setBackupOpen((o) => !o)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                  >
                    <span>Supporting response suggestions</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${backupOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {backupOpen ? (
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                      No alternate responses are configured yet. Templates will appear here when available.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="min-w-0 lg:col-span-2">
          <div className="flex h-full min-h-[min(28rem,70vh)] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-300/90 bg-slate-200/50 shadow-inner ring-1 ring-teal-900/10">
            <div className="border-b border-slate-300/80 px-5 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Summary / insight</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-800">
                {preCallArmorView?.subtext
                  ? preCallArmorView.subtext
                  : "No compliance summary is available for this moment yet. Insight will populate when pre-call or live context arrives."}
              </p>
            </div>
            <div className="border-b border-slate-300/80 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Pre-Call Armor brief</h3>
              <dl className="mt-3 space-y-0 divide-y divide-slate-300/60 text-sm">
                <div className="flex justify-between gap-2 py-2.5">
                  <dt className="text-slate-500">Caller number</dt>
                  <dd className="text-right font-medium text-slate-900">{displayCaller}</dd>
                </div>
                <div className="flex justify-between gap-2 py-2.5">
                  <dt className="text-slate-500">Contacts (last 30 days)</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {preCallData != null ? String((preCallData as any).contacts30d) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 py-2.5">
                  <dt className="text-slate-500">Last issue</dt>
                  <dd className="max-w-[55%] text-right font-medium text-slate-900">
                    {preCallData != null ? String((preCallData as any).lastIssue) : "—"}
                  </dd>
                </div>
                {(preCallData as any)?.note ? (
                  <div className="py-2.5">
                    <dt className="text-slate-500">Notes</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-slate-600">{(preCallData as any).note}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            <div className="flex-1 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">Agent context</h3>
              <div className="mt-3 rounded-xl border border-slate-300/80 bg-slate-100/80 px-4 py-3">
                <p className="text-sm leading-relaxed text-slate-600">
                  Call metrics will appear during active sessions.
                </p>
                <p className="mt-3 text-sm text-slate-700">Current state: —</p>
                <p className="mt-1 text-sm text-slate-700">Calls today: —</p>
                <p className="mt-1 text-sm text-slate-700">High severity: —</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
        </>
      )}
      {role === "manager" && (
        <>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
            {transferData ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">Transfer incoming — Pre-Call Armor loaded</div>
                  <div className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-800">
                    HIGH RISK
                  </div>
                </div>

                <div className="manager-grid">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="mb-3 text-base font-semibold text-slate-900">
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

                  <div className="rounded-xl border border-teal-200/80 bg-white p-4 shadow-sm ring-1 ring-teal-900/5">
                    <h3 className="mb-3 text-base font-semibold text-slate-900">
                      Open with this
                    </h3>
                    <div className="response-box">
                      {coachText ? `“${coachText}”` : "AI is listening to the conversation..."}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      The customer does not need to repeat themselves. CalmLine already understands the
                      situation.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">Waiting for transfer...</div>
            )}
          </div>
        </>
      )}
      {role === "admin" && (
        <>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-900">
              Policy Upload
            </h3>

            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Upload policy documents (PDF, DOCX)
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Active policies list
            </div>
          </div>
        </>
      )}
      <style jsx>{`
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
          background: #e2e8f0;
          margin: 2px 0;
        }

        .label {
          color: #64748b;
          font-size: 12px;
        }

        .value {
          color: #0f172a;
          font-size: 14px;
          text-align: right;
        }

        .response-box {
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          color: #0f172a;
          line-height: 1.6;
          border-left: 3px solid #0d9488;
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
