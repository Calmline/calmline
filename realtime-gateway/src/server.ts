import "dotenv/config";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

const apiKey =
  process.env.DEEPGRAM_API_KEY ||
  process.env.DEEPGRAM_API_KEY_REALTIME ||
  process.env.DEEPGRAM_KEY ||
  "";

console.log(
  "[deepgram] apiKey present?",
  Boolean(apiKey),
  "len=",
  apiKey ? apiKey.length : 0,
);
console.log("[boot] server.ts loaded");
console.log("[boot] ENTRY FILE RUNNING:", __filename);

const PORT = Number(process.env.PORT) || 8787;
const IDLE_TIMEOUT_MS = 60_000;
const MS_PER_MEDIA_FRAME = 20;
const PREBUFFER_MAX_BYTES = 8000 * 10; // ~10 sec cap (mulaw 8kHz = 8000 bytes/sec)
const DG_RECONNECT_BACKOFF_MS = [250, 500, 1000, 2000];

const uiClients = new Set<WebSocket>();
const UI_HEARTBEAT_INTERVAL_MS = 15_000;

/** Latest Pre-Call Armor brief; replayed to UI clients that connect after /precall ran. */
let lastPrecallData: Record<string, unknown> | null = null;

type TransferBriefBody = {
  caller: string;
  agentName: string;
  issue: string;
  attempt: string;
  outcome: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
};

/** Latest transfer briefing; replayed to UI clients that connect after POST /transfer. */
let lastTransferData: TransferBriefBody | null = null;

function broadcastToUI(type: string, payload: Record<string, unknown> = {}): void {
  const message = JSON.stringify({ type, ...payload });

  console.log(`[ui] broadcast type=${type} clients=${uiClients.size}`);

  uiClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        console.log(
          `[ui] SENT type=${type} to id=${(ws as WebSocket & { socketId?: string }).socketId}`,
        );
      } catch (err) {
        console.error("[ui] SEND ERROR", err);
      }
    } else {
      console.log("[ui] skipped client (not OPEN)");
    }
  });
}

const ROLLING_TRANSCRIPT_MAX = 1200;
// How long we wait after the last transcript update before generating a coach response
const COACH_DEBOUNCE_MS = 1800;
const COACH_PAUSE_MS = COACH_DEBOUNCE_MS;
const RESPONSE_COOLDOWN_MS = 4000;
const MIN_NEW_CHARS = 25;
const MIN_INTERVAL_MS = 900;
const MIN_PAUSE_CHARS = 10;
const MIN_FIRST_TRANSCRIPT_CHARS = 15;
const COOLDOWN_MS = 1200;
const MIN_NEW_INFO_CHARS = 40;

type AbusiveSeverity = "warning_needed" | "final_warning" | "terminate_call" | "severe";
const ABUSIVE_SCRIPTS: Record<AbusiveSeverity, string> = {
  warning_needed:
    "I want to help resolve this for you, but I need the conversation to remain respectful. If the language continues, I will need to end the call.",
  final_warning:
    "I am here to help, but I cannot continue the call if the language remains inappropriate. If it continues, I will disconnect the line now.",
  terminate_call:
    "Since the language has continued after my warning, I am ending the call now. You may call back when you are ready to speak respectfully.",
  severe:
    "I am unable to continue this conversation due to the language being used. This call is now ending.",
};

// Explicit profanity only — mild frustration words (ridiculous, insane, crazy, etc.) are NOT included
const ABUSIVE_PROFANITY = [
  "damn", "hell", "crap", "bull", "bs", "piss", "pissed", "screw", "screwed",
];
// Direct insults toward the agent only
const ABUSIVE_INSULTS = [
  "you're stupid", "you're an idiot", "you idiot", "you stupid", "you're useless",
  "you're pathetic", "stupid rep", "idiot rep", "you people", "worst service",
  "you can't do", "you don't care", "you're a jerk", "you jerk", "dumb rep",
  "incompetent", "you're incompetent", "you're worthless", "shut up", "shut it",
];
// Mild frustration phrases that must NOT trigger abuse logic
const MILD_FRUSTRATION_PHRASES = [
  "this is ridiculous", "this is insane", "this is crazy", "this makes no sense",
];
// Service-problem context: prioritize problem resolution over behavior correction
const SERVICE_PROBLEM_SIGNALS = [
  "billing", "bill", "charged", "charge", "duplicate charge", "double charge",
  "login", "log in", "logged in", "password", "account", "can't log",
  "error", "error message", "something went wrong", "not working", "broken",
  "refund", "dispute", "incorrect charge", "wrong amount", "missing payment",
];
const ABUSIVE_SEVERE = [
  "kill you", "hurt you", "find you", "you're dead", "i'll sue", "lawyer",
  "sexual", "inappropriate", "threaten", "threat",
];

function detectAbusiveLanguage(
  transcript: string,
  lastScriptSent?: "warning_needed" | "final_warning" | null,
): { abusiveDetected: boolean; severity: AbusiveSeverity; allowTerminationScript: boolean } {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return { abusiveDetected: false, severity: "warning_needed", allowTerminationScript: false };

  // Hard block: service problem (billing, charge, login, account, refund) → force abusiveDetected = false
  if (isServiceProblemContext(transcript)) {
    return { abusiveDetected: false, severity: "warning_needed", allowTerminationScript: false };
  }

  const normalized = lower.replace(/[.!?]+$/, "").trim();
  if (MILD_FRUSTRATION_PHRASES.some((p) => normalized === p)) {
    return { abusiveDetected: false, severity: "warning_needed", allowTerminationScript: false };
  }

  const wordBoundary = (w: string) =>
    new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
  let profanityCount = 0;
  for (const w of ABUSIVE_PROFANITY) {
    const m = lower.match(wordBoundary(w));
    if (m) profanityCount += m.length;
  }
  const repeatedProfanity = profanityCount >= 2;
  const anyProfanity = profanityCount >= 1;
  const insults = ABUSIVE_INSULTS.some((p) => lower.includes(p));
  const severe = ABUSIVE_SEVERE.some((p) => lower.includes(p));

  // Mild frustration phrases/words NEVER trigger abuse (e.g. "ridiculous", "insane", "crazy", "this makes no sense")
  const hasMildFrustrationPhrase =
    MILD_FRUSTRATION_PHRASES.some((p) => lower.includes(p)) ||
    ["ridiculous", "insane", "crazy"].some((w) => lower.includes(w));
  if (hasMildFrustrationPhrase && !insults && !severe) {
    return { abusiveDetected: false, severity: "warning_needed", allowTerminationScript: false };
  }

  const hasProfanityOrAbusive = anyProfanity || insults || severe;
  const repeatedAggression = repeatedProfanity || lastScriptSent != null;

  if (severe) {
    // Escalation HIGH (severe implies HIGH). Allow script only with repeated aggression.
    const escalationHigh = true;
    const allowTerminationScript = escalationHigh && hasProfanityOrAbusive && repeatedAggression;
    return { abusiveDetected: true, severity: "severe", allowTerminationScript };
  }
  if (!repeatedProfanity && !anyProfanity && !insults) {
    return { abusiveDetected: false, severity: "warning_needed", allowTerminationScript: false };
  }

  // severity=terminate_call ONLY when: abusiveDetected, escalation HIGH, and repeated aggression (already sent final_warning)
  if (lastScriptSent === "final_warning") {
    const escalationHigh = true;
    const allowTerminationScript = escalationHigh && hasProfanityOrAbusive && repeatedAggression;
    return { abusiveDetected: true, severity: "terminate_call", allowTerminationScript };
  }
  if (lastScriptSent === "warning_needed") {
    const escalationHigh = true;
    const allowTerminationScript = escalationHigh && hasProfanityOrAbusive && repeatedAggression;
    return { abusiveDetected: true, severity: "final_warning", allowTerminationScript };
  }
  // warning_needed: allow termination/language script ONLY if repeated aggression (not single frustrated statement)
  const escalationHigh = repeatedAggression; // HIGH only when repeated
  const allowTerminationScript = hasProfanityOrAbusive && repeatedAggression && escalationHigh;
  return { abusiveDetected: true, severity: "warning_needed", allowTerminationScript };
}

function isServiceProblemContext(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return false;
  return SERVICE_PROBLEM_SIGNALS.some((signal) => lower.includes(signal));
}

function shouldGenerateResponse(transcript: string): boolean {
  const text = transcript.trim().toLowerCase();
  if (!text) return false;

  // Block short or simple inputs
  if (text.length < 40) return false;

  // Block greetings / introductions
  const blockedPatterns = [
    "hello",
    "hi",
    "hey",
    "my name is",
    "this is",
    "can you hear me",
  ];

  for (const pattern of blockedPatterns) {
    if (text.includes(pattern)) {
      return false;
    }
  }

  // Only allow if meaningful intent exists
  const intentKeywords = [
    "help",
    "issue",
    "problem",
    "charged",
    "refund",
    "not working",
    "frustrated",
    "upset",
    "angry",
    "need",
    "why",
    "what happened",
  ];

  return intentKeywords.some((keyword) => text.includes(keyword));
}

/** Classification for response generation only. Used when we are NOT taking the abusive-script path. */
function classifyForResponse(
  transcript: string,
  abusiveDetected: boolean,
  allowTerminationScript: boolean,
): { escalationLevel: "LOW" | "MEDIUM"; isOperationalIssue: boolean } {
  const isOperationalIssue = isServiceProblemContext(transcript);
  const lower = transcript.toLowerCase().trim();
  const isOnlyMildFrustration =
    MILD_FRUSTRATION_PHRASES.some((p) => lower.replace(/[.!?]+$/, "").trim() === p);
  if (isOnlyMildFrustration) {
    return { escalationLevel: "LOW", isOperationalIssue };
  }
  const escalationLevel =
    abusiveDetected && !allowTerminationScript ? "MEDIUM" : "LOW";
  return { escalationLevel, isOperationalIssue };
}

function ts(): string {
  return new Date().toISOString();
}

function hashText(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function parseCoachOutput(full: string): {
  say_now: string;
  next_question: string;
  internal_notes: string;
} {
  const result = { say_now: "", next_question: "", internal_notes: "" };
  const qIdx = full.search(/\n\s*NEXT_QUESTION:/i);
  const notesIdx = full.search(/\n\s*INTERNAL_NOTES:/i);
  if (qIdx >= 0) {
    result.say_now = full.slice(0, qIdx).trim();
    const afterQ = full.slice(qIdx);
    const qMatch = /NEXT_QUESTION:\s*([\s\S]+?)(?=INTERNAL_NOTES:|$)/i.exec(afterQ);
    if (qMatch) result.next_question = qMatch[1].trim();
  } else {
    result.say_now = full.trim();
  }
  const notesMatch = /INTERNAL_NOTES:\s*([\s\S]*)$/i.exec(full);
  if (notesMatch) result.internal_notes = notesMatch[1].trim();
  if (!result.say_now) result.say_now = full.trim();
  return result;
}

function fetchPolicyChunksStub(_context: string, _signal: AbortSignal): Promise<string[]> {
  return Promise.resolve([]);
}

const TURN_COACH_SYSTEM_PROMPT = `You are Calmline, a real-time customer support coach. Output in this exact format:

1. First line(s): The exact words the agent should read aloud (1-2 short sentences). Start with a strong, natural opening and then 1 clear action or next step. Do NOT repeat the customer verbatim.
2. Then a blank line, then: NEXT_QUESTION: <exactly one question to ask>
3. Then: INTERNAL_NOTES: <short optional note, max 1 line>

Example:
Got it, that sounds frustrating. I'm going to fix this now and check what happened with your order.

NEXT_QUESTION: When did you place this order, and what amount do you see on your statement?
INTERNAL_NOTES: Customer reporting possible duplicate charge on recent order

Keep the spoken part under 2 sentences. Be calm, confident, concise, and policy-safe.

OPENING AND TONE RULES (mandatory):
- Avoid weak openings like "I understand", "I see", or "I'm sorry". Prefer strong, natural openings such as "Got it,", "Okay, I hear you,", or "I can see what's happening here,".
- The agent should sound confident and in control, not submissive or overly apologetic.

ACTION LANGUAGE RULES (mandatory):
- Do NOT use weak, passive phrases like "let me check", "I'll look into it", or "I'll try". Replace them with strong action language like "I'm going to fix this now", "I'll take care of this right away", or "Let's get this resolved now".

CONTEXT-SPECIFIC RULES (mandatory):
- If the transcript mentions a specific issue (e.g. billing, charges, duplicate charge, refund, login, password, account access, error messages), the response MUST clearly reference that issue instead of generic empathy.
- For operational issues (billing, login, account, refund, error, duplicate charge): ALWAYS prioritize resolving the specific issue over tone commentary. Be direct and solution-focused.

ESCALATION AND BEHAVIOR RULES (mandatory):
- Do NOT suggest ending the call, warning about behavior, or mentioning language/respect. You only generate problem-solving responses.
- Treat customer frustration (e.g. "this is ridiculous", "this is insane", "this makes no sense") as normal frustration — respond with LOW escalation: focus on fixing the problem, be calm and helpful. Do NOT treat these as abuse or correct tone.
- For LOW escalation: focus on fixing the problem; be calm, direct, and helpful; do NOT escalate tone or mention behavior.`;

type CoachTiming = {
  firstDeltaAt?: number;
  doneAt?: number;
};

type CoachContext = {
  escalationLevel?: "LOW" | "MEDIUM";
  isOperationalIssue?: boolean;
};

async function streamCoachSuggestion(
  context: string,
  signal: AbortSignal,
  onDelta: (delta: string, seq: number) => void,
  timing?: CoachTiming,
  coachContext?: CoachContext,
): Promise<string | null> {
  const text = context.trim();
  if (!text) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[openai] missing OPENAI_API_KEY");
    return null;
  }

  const policyChunks = await fetchPolicyChunksStub(context, signal);
  let systemPrompt = TURN_COACH_SYSTEM_PROMPT;

  if (coachContext?.isOperationalIssue) {
    systemPrompt +=
      "\n\nThis conversation is about an operational issue (billing, login, account, etc.). Prioritize resolving the customer's problem. Do not correct tone or mention behavior.";
  }
  if (coachContext?.escalationLevel === "LOW") {
    systemPrompt +=
      "\n\nCurrent escalation is LOW. Focus only on fixing the problem; be calm, direct, and helpful. Do not escalate tone or mention behavior or language.";
  }

  if (policyChunks.length > 0) {
    systemPrompt +=
      "\n\nCompany Policy (authoritative):\n" +
      policyChunks.map((c) => c.trim()).join("\n\n");
  }

  const trimmed = text.slice(-ROLLING_TRANSCRIPT_MAX);
  const userPrompt =
    "Live transcript (last ~1200 chars):\n" + trimmed + "\n\nGenerate the agent's next response.";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
        temperature: 0.2,
      }),
      signal,
    });

    if (!res.ok) {
      console.error("[openai] coach request failed with status", res.status);
      return null;
    }

    if (!res.body) {
      console.error("[openai] coach stream missing response body");
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let seq = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let splitIdx = buffer.indexOf("\n\n");
      while (splitIdx !== -1) {
        const rawEvent = buffer.slice(0, splitIdx);
        buffer = buffer.slice(splitIdx + 2);

        const lines = rawEvent.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const jsonText = line.slice(5).trim();
          if (!jsonText || jsonText === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonText) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              if (timing && timing.firstDeltaAt == null) {
                timing.firstDeltaAt = Date.now();
              }
              full += delta;
              seq += 1;
              onDelta(delta, seq);
            }
          } catch {
            // Ignore partial/non-JSON event lines.
          }
        }

        splitIdx = buffer.indexOf("\n\n");
      }
    }

    if (timing) timing.doneAt = Date.now();
    const reply = full.trim();
    return reply || null;
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      return null;
    }
    console.error("[openai] coach error", err);
    return null;
  }
}

type TwilioMessage = {
  event: string;
  payload?: string;
  start?: { streamSid?: string };
  stop?: { streamSid?: string };
  [key: string]: unknown;
};

type StreamState = {
  streamSid: string;
  totalFrames: number;
  totalBytes: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

function getHost(req: http.IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-host"];
  if (forwarded && typeof forwarded === "string")
    return forwarded.split(",")[0].trim();
  const host = req.headers.host;
  if (host && typeof host === "string") return host;
  return "localhost:8787";
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createHttpServer(): http.Server {
  return http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
      return;
    }
    const pathname = req.url?.split("?")[0] ?? "";
    if (pathname === "/precall" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) as { from?: string; timestamp?: number } : {};
          const number = (parsed.from || "unknown").trim() || "unknown";
          console.log(`[precall] incoming call from ${number}`);

          const precallBriefPayload = {
            risk: "LOW",
            context: "No prior history. First-time caller.",
            waitTime: "0 seconds",
            opening: "Thank you for calling, how can I help you today?",
          };
          lastPrecallData = precallBriefPayload;

          // Stub pipeline: broadcast initial Pre-Call Armor brief to all connected UI clients.
          broadcastToUI("precall_brief", precallBriefPayload);

          uiClients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: "precall",
                data: {
                  from: parsed.from,
                  risk: "HIGH",
                  summary: "Caller has prior escalation history",
                  opening: "Hi, I understand this has been frustrating. I’m here to help.",
                },
              }));
            }
          });
          console.log("[precall] broadcast sent");

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          console.error("[precall] invalid payload", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Invalid JSON payload" }));
        }
      });
      return;
    }
    if (pathname === "/transfer" && req.method === "POST") {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk.toString();
      });
      req.on("end", () => {
        try {
          const body = raw
            ? (JSON.parse(raw) as Record<string, unknown>)
            : {};
          console.log("[transfer] incoming transfer", body);

          const transferBody: TransferBriefBody = {
            caller: String(body.caller ?? ""),
            agentName: String(body.agentName ?? ""),
            issue: String(body.issue ?? ""),
            attempt: String(body.attempt ?? ""),
            outcome: String(body.outcome ?? ""),
            risk:
              body.risk === "LOW" ||
              body.risk === "MEDIUM" ||
              body.risk === "HIGH"
                ? body.risk
                : "LOW",
          };
          lastTransferData = transferBody;

          uiClients.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(
                  JSON.stringify({
                    type: "transfer_brief",
                    data: transferBody,
                  }),
                );
              } catch (sendErr) {
                console.error("[transfer] ws.send error", sendErr);
              }
            }
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          console.error("[transfer] invalid payload", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Invalid JSON payload" }));
        }
      });
      return;
    }
    if (pathname === "/api/twilio/voice" && req.method === "POST") {
      let host = getHost(req);
      if (host.includes("localhost") || host.startsWith("127.0.0.1")) {
        const publicHost =
          process.env.PUBLIC_HOST || process.env.TWILIO_STREAM_HOST;
        if (publicHost) {
          host = publicHost.replace(/^https?:\/\//, "").split("/")[0];
          console.warn(
            "[twilio/voice] host was localhost; using PUBLIC_HOST/TWILIO_STREAM_HOST:",
            host,
          );
        } else {
          console.warn(
            "[twilio/voice] WARNING: host is",
            host,
            "- Twilio cannot reach this. Set PUBLIC_HOST or TWILIO_STREAM_HOST to your public URL (e.g. ngrok).",
          );
        }
      }
      const streamUrl = `wss://${host}/twilio/media`;
      console.log("[twilio/voice] Stream URL (exact):", streamUrl);
      const streamUrlAttr = escapeXmlAttr(streamUrl);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Calmline is connected. Please hold while we start your session.</Say>
  <Pause length="1"/>
  <Say voice="alice">You can begin speaking now.</Say>
  <Start>
    <Stream url="${streamUrlAttr}"/>
  </Start>
  <Pause length="600"/>
</Response>`;
      req.on("data", () => {});
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "text/xml" });
        res.end(twiml);
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
}

function runServer(): void {
  const server = createHttpServer();
  const twilioWss = new WebSocketServer({ noServer: true });
  const uiWss = new WebSocketServer({ noServer: true });

  setInterval(() => {
    const toRemove: WebSocket[] = [];
    uiClients.forEach((ws) => {
      const alive = (ws as WebSocket & { isAlive?: boolean }).isAlive;
      if (alive === false) {
        toRemove.push(ws);
      } else {
        (ws as WebSocket & { isAlive?: boolean }).isAlive = false;
        ws.ping();
      }
    });
    for (const ws of toRemove) {
      uiClients.delete(ws);
      console.log(
        `[ui] heartbeat timeout, removed dead client, clients=${uiClients.size}`,
      );
      ws.terminate();
    }
  }, UI_HEARTBEAT_INTERVAL_MS);

  function handleUIConnection(ws: WebSocket): void {
    console.log("[ui] CLIENT CONNECTED");
    const socketId = Date.now() + "-" + Math.floor(Math.random() * 1000);
    (ws as WebSocket & { socketId?: string }).socketId = socketId;
    (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    ws.on("pong", () => {
      (ws as WebSocket & { isAlive?: boolean }).isAlive = true;
    });
    uiClients.add(ws);
    console.log(`[ui] CONNECT id=${socketId} clients=${uiClients.size}`);

    if (lastPrecallData) {
      try {
        ws.send(
          JSON.stringify({
            type: "precall_brief",
            data: lastPrecallData,
          }),
        );
      } catch (err) {
        console.error("[ui] failed to send replayed precall_brief", err);
      }
    }

    if (lastTransferData) {
      try {
        ws.send(
          JSON.stringify({
            type: "transfer_brief",
            data: lastTransferData,
          }),
        );
      } catch (err) {
        console.error("[ui] failed to send replayed transfer_brief", err);
      }
    }

    ws.on("close", (code, reason) => {
      uiClients.delete(ws);
      const safeReason =
        typeof reason === "string"
          ? reason
          : Buffer.isBuffer(reason)
            ? reason.toString()
            : String(reason ?? "");
      console.log(
        `[ui] CLOSE code=${code} reason="${safeReason}" clients=${uiClients.size}`,
      );
    });
    ws.on("error", (err) => {
      console.error("[ui] ERROR", err);
      uiClients.delete(ws);
    });
  }

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/ui") {
      uiWss.handleUpgrade(req, socket, head, (ws) => {
        handleUIConnection(ws);
      });
      return;
    }

    const pathname = new URL(req.url ?? "", "http://localhost").pathname;

    if (pathname.startsWith("/twilio/media")) {
      twilioWss.handleUpgrade(req, socket, head, (ws) => {
        twilioWss.emit("connection", ws, req);
      });
      return;
    }

    socket.destroy();
  });

  twilioWss.on("connection", (ws, _request) => {
    const state: StreamState = {
      streamSid: "",
      totalFrames: 0,
      totalBytes: 0,
      idleTimer: null,
    };

    // Turn/Chunk Coach Loop: rolling transcript, pause/growth/interval triggers
    let rollingTranscript = "";
    let lastCoachAt = 0;
    let lastCoachChars = 0;
    let coachInFlight = false;
    let isGenerating = false;
    let currentCoachId = 0;
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;
    let coachAbortController: AbortController | null = null;
    let intervalTimer: ReturnType<typeof setInterval> | null = null;

    let lastAppendedFinal = "";
    let lastTranscriptTs = 0;
    let hasCoachedYet = false;
    let lastFinalAt = 0;
    let lastFinalTranscriptLen = 0;
    let lastAbusiveScriptSent: "warning_needed" | "final_warning" | null = null;
    let lastEscalationLevel: "LOW" | "MEDIUM" | null = null;
    let lastIssueHash: string | null = null;
    let lastProcessedTranscript = "";
    let currentRequestId = 0;
    let lastResponseTime = 0;

    function maybeTriggerCoachFirstTranscript(): void {
      const chars = rollingTranscript.trim().length;
      if (chars < MIN_FIRST_TRANSCRIPT_CHARS) return;
      if (hasCoachedYet || coachInFlight) return;
      // Still uses maybeTriggerCoach, which now has a global debounce gate.
      maybeTriggerCoach("first_transcript");
    }

    function appendToRollingTranscript(text: string, isFinal: boolean): void {
      lastTranscriptTs = Date.now();
      if (isFinal) {
        if (text === lastAppendedFinal) return;
        lastAppendedFinal = text;
        rollingTranscript = rollingTranscript ? `${rollingTranscript}\n${text}` : text;
      } else {
        lastAppendedFinal = "";
        const lastNewline = rollingTranscript.lastIndexOf("\n");
        const base = lastNewline >= 0 ? rollingTranscript.slice(0, lastNewline + 1) : "";
        rollingTranscript = base + text;
      }
      if (rollingTranscript.length > ROLLING_TRANSCRIPT_MAX) {
        rollingTranscript = rollingTranscript.slice(-ROLLING_TRANSCRIPT_MAX);
      }
    }

    function maybeTriggerCoach(reason: "pause" | "growth" | "interval" | "first_transcript"): void {
      const sinceLastTranscript = Date.now() - lastTranscriptTs;
      if (sinceLastTranscript < COACH_DEBOUNCE_MS) {
        console.log("[coach] BLOCKED by debounce", sinceLastTranscript, "ms reason=", reason);
        return;
      }
      console.log("[coach] ALLOWED after pause", sinceLastTranscript, "ms reason=", reason);

      const now = Date.now();
      const sinceLastResponse = now - lastResponseTime;
      if (sinceLastResponse < RESPONSE_COOLDOWN_MS) {
        console.log(
          "[coach] BLOCKED by cooldown",
          sinceLastResponse,
          "ms (<",
          RESPONSE_COOLDOWN_MS,
          "ms) reason=",
          reason,
        );
        return;
      }

      const { abusiveDetected, severity, allowTerminationScript } = detectAbusiveLanguage(rollingTranscript, lastAbusiveScriptSent);
      const serviceProblem = isServiceProblemContext(rollingTranscript);
      if (serviceProblem && abusiveDetected) {
        console.log("[abuse] service-problem context → prioritize problem resolution, skip behavior correction");
      }
      // HARD GUARDRAIL: Do NOT allow call-ending or behavioral warning responses unless BOTH:
      // (1) Escalation level is HIGH (allowTerminationScript implies: explicit profanity or repeated abusive language present),
      // (2) Explicit profanity or repeated abusive language is present (encoded in allowTerminationScript).
      // Operational issues (billing, login, account, etc.) never use this path — treat as solvable, not behavioral.
      if (abusiveDetected && allowTerminationScript && !serviceProblem) {
        console.log("[abuse] detected=true severity=" + severity + " allowTerminationScript=true");
        console.log("[abuse] override_tone=ABUSIVE");
        console.log("[abuse] override_risk=HIGH");
        console.log("[abuse] override_response=true");
        const script = ABUSIVE_SCRIPTS[severity];
        currentCoachId += 1;
        const coachId = currentCoachId;
        if (coachAbortController) {
          coachAbortController.abort();
          coachAbortController = null;
        }
        coachInFlight = true;
        // For abusive scripts, only emit a single, final suggestion to the UI.
        broadcastToUI("coach_final", { coachId, messageId: coachId, text: script, message: script });
        if (severity === "warning_needed" || severity === "final_warning") {
          lastAbusiveScriptSent = severity;
        }
        broadcastToUI("risk_update", { score: 3, level: "HIGH", signals: ["abusive_language"] });
        broadcastToUI("conversation_state", { state: "ABUSIVE", strategy: "Firm boundary setting." });
        coachInFlight = false;
        lastCoachAt = Date.now();
        lastCoachChars = rollingTranscript.length;
        coachAbortController = null;
        return;
      }
      if (abusiveDetected && !allowTerminationScript) {
        console.log("[abuse] detected=true severity=" + severity + " allowTerminationScript=false → fallback to standard de-escalation");
      }

      const chars = rollingTranscript.length;
      const transcriptLen = rollingTranscript.trim().length;
      const normalizedTranscript = rollingTranscript.trim().toLowerCase();
      const wordCount = normalizedTranscript.split(/\s+/).filter(Boolean).length;
      const hasSentenceBoundary = /[.!?]\s*$/.test(normalizedTranscript);
      const hasMinWordsOrSentence = wordCount >= 10 || hasSentenceBoundary;
      const newChars = chars - lastCoachChars;
      const sinceLastMs = Date.now() - lastCoachAt;
      const timeSinceLastFinal = Date.now() - lastFinalAt;
      const newInfoChars = chars - lastFinalTranscriptLen;
      const growthOk = newChars >= MIN_NEW_CHARS;
      const intervalOk = sinceLastMs >= MIN_INTERVAL_MS;
      const pauseOk = reason === "pause" && transcriptLen >= MIN_PAUSE_CHARS;
      const growthOrIntervalOk = growthOk || intervalOk;
      const hasMinContent = transcriptLen >= MIN_PAUSE_CHARS;
      const hasNewText = newChars > 0 || reason === "pause" || reason === "first_transcript";
      const bypassCooldown = reason === "pause" || reason === "first_transcript";
      const cooldownOk = bypassCooldown || timeSinceLastFinal >= COOLDOWN_MS;

      // Allow an initial response even if newInfoChars is small, as long as we have some transcript
      // or the call has been active briefly. Also add a hard fallback once transcriptLen is meaningful.
      const firstResponseEligible = !hasCoachedYet && transcriptLen > 0;
      const sinceFirstTranscript =
        firstTranscriptTs != null ? Date.now() - firstTranscriptTs : null;
      const firstTimeOk = sinceFirstTranscript != null && sinceFirstTranscript >= 1500;
      const forceFirst = !hasCoachedYet && transcriptLen > 20;

      const newInfoOk =
        bypassCooldown ||
        newInfoChars >= MIN_NEW_INFO_CHARS ||
        firstResponseEligible ||
        firstTimeOk;

      const hasNewTextOrFirst = hasNewText || forceFirst;
      const reasonOk =
        reason === "first_transcript" ||
        pauseOk ||
        (reason === "growth" && growthOrIntervalOk) ||
        (reason === "interval" && growthOrIntervalOk);

      const shouldRun =
        !coachInFlight &&
        !isGenerating &&
        hasMinContent &&
        hasMinWordsOrSentence &&
        hasNewTextOrFirst &&
        cooldownOk &&
        (newInfoOk || forceFirst) &&
        (reasonOk || forceFirst);

      if (!shouldGenerateResponse(normalizedTranscript)) {
        console.log("[coach] SKIP low-value/premature response for transcript");
        return;
      }

      const isMeaningfullyDifferent =
        Math.abs(normalizedTranscript.length - lastProcessedTranscript.length) > 20;
      if (!isMeaningfullyDifferent) {
        console.log("[coach] SKIP — transcript change not meaningful; avoiding re-generate");
        return;
      }

      if (!cooldownOk) {
        console.log(
          "[coach] SUPPRESS cooldown=",
          Math.max(0, COOLDOWN_MS - timeSinceLastFinal),
          "newInfoChars=",
          newInfoChars,
          "reason=",
          reason,
        );
      } else if (!newInfoOk) {
        console.log(
          "[coach] SUPPRESS cooldown=n/a newInfoChars=",
          newInfoChars,
          "reason=",
          reason,
        );
      }

      console.log(
        "[coach] TRIGGER reason=",
        reason,
        "newChars=",
        newChars,
        "transcriptLen=",
        transcriptLen,
        "sinceLastMs=",
        sinceLastMs,
        "inFlight=",
        coachInFlight,
        "hasCoachedYet=",
        hasCoachedYet,
      );

      if (!shouldRun) return;

      const tTrigger = Date.now();

      currentCoachId += 1;
      const coachId = currentCoachId;
      currentRequestId += 1;
      const requestId = currentRequestId;

      coachInFlight = true;
      isGenerating = true;
      if (coachAbortController) {
        coachAbortController.abort();
        coachAbortController = null;
      }
      const controller = new AbortController();
      coachAbortController = controller;

      if (!hasCoachedYet) hasCoachedYet = true;
      console.log("[coach] START coachId=", coachId);

      const tOpenaiStart = Date.now();
      const coachTiming: CoachTiming = {};

      const responseClassification = classifyForResponse(
        rollingTranscript,
        abusiveDetected,
        allowTerminationScript,
      );
      const issueKey = hashText(rollingTranscript.trim().slice(-200));
      if (
        hasCoachedYet &&
        responseClassification.escalationLevel === lastEscalationLevel &&
        issueKey === lastIssueHash
      ) {
        console.log(
          "[coach] SKIP new suggestion — stable escalation and issue; avoiding flicker",
        );
        return;
      }
      void streamCoachSuggestion(
        rollingTranscript,
        controller.signal,
        (delta, _seq) => {
          // Only track timing for internal metrics; do NOT stream partial text to the UI.
          if (controller.signal.aborted) return;
          if (coachId !== currentCoachId) return;
          if (firstCoachDeltaTs == null) firstCoachDeltaTs = Date.now();
        },
        coachTiming,
        responseClassification,
      ).then((finalText) => {
        if (requestId !== currentRequestId) {
          // Outdated response – a newer generation has started. Ignore this result.
          console.log("[coach] IGNORE outdated response for requestId=", requestId, "currentRequestId=", currentRequestId);
          if (coachAbortController === controller) {
            coachAbortController = null;
          }
          coachInFlight = false;
          isGenerating = false;
          return;
        }
        if (coachAbortController === controller) {
          coachAbortController = null;
        }
        coachInFlight = false;
        isGenerating = false;
        lastCoachAt = Date.now();
        lastCoachChars = rollingTranscript.length;

        const tDone = coachTiming.doneAt ?? lastCoachAt;
        const tFirstDelta = coachTiming.firstDeltaAt;
        const dgToTrigger = lastTranscriptTs > 0 ? tTrigger - lastTranscriptTs : null;
        const openaiToFirstDelta = tFirstDelta != null ? tFirstDelta - tOpenaiStart : null;
        const total = tDone - tTrigger;

        console.log(
          "[coach] TIMING dg_to_trigger=",
          dgToTrigger ?? "n/a",
          "openai_to_first_delta=",
          openaiToFirstDelta ?? "n/a",
          "total=",
          total,
        );

        if (!controller.signal.aborted && finalText && coachId === currentCoachId) {
          lastFinalAt = Date.now();
          lastResponseTime = lastFinalAt;
          lastFinalTranscriptLen = rollingTranscript.length;
          lastEscalationLevel = responseClassification.escalationLevel;
          lastIssueHash = issueKey;
          lastProcessedTranscript = normalizedTranscript;
          const parsed = parseCoachOutput(finalText);
          broadcastToUI("coach_final", {
            coachId,
            messageId: coachId,
            text: parsed.say_now,
            message: parsed.say_now,
            next_question: parsed.next_question,
            internal_notes: parsed.internal_notes,
            latency_ms: total,
          });
        }
      }).catch((err) => {
        if (coachAbortController === controller) {
          coachAbortController = null;
        }
        coachInFlight = false;
        isGenerating = false;
        console.error("[coach] ERROR", err);
      });
    }

    function schedulePauseTrigger(): void {
      if (pauseTimer) clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => {
        pauseTimer = null;
        maybeTriggerCoach("pause");
      }, COACH_PAUSE_MS);
    }

    let dg: ReturnType<
      ReturnType<typeof createClient>["listen"]["live"]
    > | null = null;
    let dgReady = false;
    let firstFrameLogged = false;
    let mediaCount = 0;
    let prebufferBytes = 0;
    const prebuffer: Buffer[] = [];
    let twilioMediaFirstSeenTs: number | null = null;
    let deepgramOpenTs: number | null = null;
    let firstTranscriptTs: number | null = null;
    let firstCoachDeltaTs: number | null = null;
    let dgReconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dgReconnectAttempt = 0;
    let dgStopped = false; // true when Twilio STOP received, skip reconnect

    let dgOpenTimeout: ReturnType<typeof setTimeout> | null = null;

    function connectDeepgram(): void {
      console.log("[deepgram] connectDeepgram() called");
      if (!apiKey) {
        console.error(
          "[deepgram] NO API KEY in this process. Deepgram will not connect.",
        );
        dgReady = false;
        return;
      }
      if (dgStopped) return;
      if (dg) {
        try {
          (dg as { requestClose?: () => void }).requestClose?.();
        } catch (_) {}
        dg = null;
      }
      if (dgOpenTimeout) {
        clearTimeout(dgOpenTimeout);
        dgOpenTimeout = null;
      }
      dgReady = false;

      dgOpenTimeout = setTimeout(() => {
        dgOpenTimeout = null;
        if (!dgReady) {
          console.warn("[deepgram] OPEN TIMEOUT (still not ready after 2000ms)");
        }
      }, 2000);

      const handleOpen = () => {
        if (dgOpenTimeout) {
          clearTimeout(dgOpenTimeout);
          dgOpenTimeout = null;
        }
        dgReady = true;
        deepgramOpenTs = Date.now();
        dgReconnectAttempt = 0;
        console.log("[deepgram] OPEN");
        if (!intervalTimer) {
          intervalTimer = setInterval(() => maybeTriggerCoach("interval"), MIN_INTERVAL_MS);
        }
        const toFlush = prebufferBytes;
        for (const buf of prebuffer) {
          try {
            if (dg)
              dg.send(
                buf.buffer.slice(
                  buf.byteOffset,
                  buf.byteOffset + buf.byteLength,
                ),
              );
          } catch (_) {}
        }
        prebuffer.length = 0;
        prebufferBytes = 0;
        if (toFlush > 0) {
          console.log("[deepgram] OPEN — flushing prebuffer bytes=", toFlush);
        }
      };

      const handleClose = (code?: number | string, reason?: string) => {
        dgReady = false;
        if (dgOpenTimeout) {
          clearTimeout(dgOpenTimeout);
          dgOpenTimeout = null;
        }
        console.log(
          "[deepgram] CLOSE code=" +
            (code ?? "?") +
            " reason=" +
            JSON.stringify(String(reason ?? "")),
        );
        const hadConnection = dg !== null;
        dg = null;
        if (hadConnection && !dgStopped && apiKey) {
          const delay =
            DG_RECONNECT_BACKOFF_MS[
              Math.min(dgReconnectAttempt, DG_RECONNECT_BACKOFF_MS.length - 1)
            ];
          dgReconnectAttempt += 1;
          console.log(
            "[deepgram] reconnecting in",
            delay,
            "ms (attempt",
            dgReconnectAttempt,
            ")",
          );
          dgReconnectTimer = setTimeout(() => {
            dgReconnectTimer = null;
            connectDeepgram();
          }, delay);
        }
      };

      const handleError = (e: unknown) => {
        dgReady = false;
        if (dgOpenTimeout) {
          clearTimeout(dgOpenTimeout);
          dgOpenTimeout = null;
        }
        console.error("[deepgram] ERROR", e);
        const hadConnection = dg !== null;
        dg = null;
        if (hadConnection && !dgStopped && apiKey) {
          const delay =
            DG_RECONNECT_BACKOFF_MS[
              Math.min(dgReconnectAttempt, DG_RECONNECT_BACKOFF_MS.length - 1)
            ];
          dgReconnectAttempt += 1;
          console.log(
            "[deepgram] reconnecting in",
            delay,
            "ms after error (attempt",
            dgReconnectAttempt,
            ")",
          );
          dgReconnectTimer = setTimeout(() => {
            dgReconnectTimer = null;
            connectDeepgram();
          }, delay);
        }
      };

      try {
        const deepgram = createClient(apiKey);
        dg = deepgram.listen.live({
          model: "nova-2",
          encoding: "mulaw",
          sample_rate: 8000,
          channels: 1,
          interim_results: true,
          smart_format: true,
          endpointing: 300,
          vad_events: true,
          utterance_end_ms: 1000,
        } as Record<string, unknown>);
        console.log("[deepgram] dg object created");

        dg.on(LiveTranscriptionEvents.Open, () => {
          console.log("[deepgram] (LiveTranscriptionEvents.Open)");
          handleOpen();
        });
        dg.on(LiveTranscriptionEvents.Close, (evt: { code?: number; reason?: string }) => {
          const code = evt?.code ?? "unknown";
          const reason = evt?.reason ?? "";
          console.log(
            `[deepgram] (LiveTranscriptionEvents.Close) code=${code} reason="${reason}"`,
          );
          handleClose(code, reason);
        });
        dg.on(LiveTranscriptionEvents.Error, (err: unknown) => {
          console.error("[deepgram] (LiveTranscriptionEvents.Error) ERROR", err);
          handleError(err);
        });
        (dg as { on?: (ev: string, fn: (...args: unknown[]) => void) => void }).on?.(
          "open",
          () => {
            console.log("[deepgram] (raw open)");
          },
        );
        (dg as { on?: (ev: string, fn: (...args: unknown[]) => void) => void }).on?.(
          "close",
          (code: unknown, reason: unknown) => {
            const reasonStr =
              typeof reason === "string"
                ? reason
                : Buffer.isBuffer(reason)
                  ? reason.toString()
                  : (reason as { toString?: () => string })?.toString?.() ?? "";
            console.log(
              `[deepgram] (raw close) code=${code} reason="${reasonStr}"`,
            );
          },
        );
        (dg as { on?: (ev: string, fn: (...args: unknown[]) => void) => void }).on?.(
          "error",
          (err: unknown) => {
            console.error("[deepgram] (raw error)", err);
          },
        );
        dg.on(
          LiveTranscriptionEvents.Transcript,
        (data: {
          is_final?: boolean;
          channel?: { alternatives: { transcript: string }[] };
        }) => {
          const text = data?.channel?.alternatives?.[0]?.transcript?.trim();
          if (!text) return;
          const isFinal = !!data.is_final;
          if (firstTranscriptTs == null) {
            firstTranscriptTs = Date.now();
            const firstTranscriptMs = deepgramOpenTs != null ? firstTranscriptTs - deepgramOpenTs : null;
            console.log(
              "[timing] first_transcript_ms=",
              firstTranscriptMs ?? "n/a",
              "len=",
              text.length,
              "is_final=",
              isFinal,
            );
          }

          if (isFinal) {
            console.log("[dg]", ts(), "FINAL", `len=${text.length}`, text);
            broadcastToUI("transcript", { text });
          } else {
            console.log("[dg]", ts(), "INTERIM", `len=${text.length}`, text);
          }

          appendToRollingTranscript(text, isFinal);
          const { abusiveDetected } = detectAbusiveLanguage(rollingTranscript, lastAbusiveScriptSent);
          if (abusiveDetected) {
            broadcastToUI("risk_update", { score: 3, level: "HIGH", signals: ["abusive_language"] });
            broadcastToUI("conversation_state", { state: "ABUSIVE", strategy: "Firm boundary setting." });
          }
          schedulePauseTrigger();
          if (isFinal) maybeTriggerCoach("growth");
          maybeTriggerCoachFirstTranscript();
        });
      } catch (e) {
        console.error("[deepgram] failed to create live connection:", e);
        dgReady = false;
        if (dgOpenTimeout) {
          clearTimeout(dgOpenTimeout);
          dgOpenTimeout = null;
        }
      }
    }

    function resetIdleTimer(): void {
      if (state.idleTimer) clearTimeout(state.idleTimer);
      state.idleTimer = setTimeout(() => {
        ws.close();
      }, IDLE_TIMEOUT_MS);
    }

    function clearIdleTimer(): void {
      if (state.idleTimer) {
        clearTimeout(state.idleTimer);
        state.idleTimer = null;
      }
    }

    resetIdleTimer();

    ws.on("message", (data: Buffer | Buffer[]) => {
      const raw = Buffer.isBuffer(data) ? data : Buffer.concat(data);
      let msg: TwilioMessage;
      try {
        msg = JSON.parse(raw.toString()) as TwilioMessage;
      } catch {
        return;
      }

      const event = msg.event;
      if (event === "connected") {
        return;
      }
      if (event === "start") {
        const startInfo = (msg as any).start;
        console.log(
          "[twilio] START",
          startInfo?.callSid,
          startInfo?.streamSid,
          "— notifying UI",
        );
        // Notify any connected UI clients that a live call has started.
        // The Live Session page listens for a `call_state` message to move
        // from "Connecting..." to an active state.
        broadcastToUI("call_state", {
          state: "active",
          from:
            typeof startInfo?.from === "string" && startInfo.from.trim().length > 0
              ? startInfo.from
              : undefined,
          callSid: startInfo?.callSid,
          streamSid: startInfo?.streamSid,
        });
        console.log("[ui] broadcast initial call_state=active");

        console.log("[twilio] START received — calling connectDeepgram()");
        state.streamSid = msg.start?.streamSid ?? "";
        connectDeepgram();
        return;
      }
      const payload =
        (msg as { media?: { payload?: string } }).media?.payload ?? msg.payload;
      if (event === "media" && typeof payload === "string") {
        mediaCount += 1;
        if (mediaCount % 50 === 0) {
          const mediaPayload = (msg as any).media?.payload ?? payload;
          console.log(
            "[twilio] media frames:",
            mediaCount,
            "payload bytes:",
            Buffer.from(mediaPayload || "", "base64").length,
          );
        }
        clearIdleTimer();
        resetIdleTimer();
        const audio = Buffer.from((msg as any).media.payload, "base64");
        if (twilioMediaFirstSeenTs == null) twilioMediaFirstSeenTs = Date.now();
        if (!firstFrameLogged) {
          console.log("[twilio] first audio bytes", audio.length);
          firstFrameLogged = true;
        }
        state.totalFrames += 1;
        state.totalBytes += audio.length;
        if (!dg || !dgReady) {
          while (prebufferBytes + audio.length > PREBUFFER_MAX_BYTES && prebuffer.length > 0) {
            const old = prebuffer.shift()!;
            prebufferBytes -= old.length;
          }
          prebuffer.push(audio);
          prebufferBytes += audio.length;
          if (mediaCount === 1 || mediaCount % 50 === 0) {
            console.log("[deepgram] prebuffer bytes=", prebufferBytes, "frames=", prebuffer.length);
          }
          return;
        }
        try {
          if (mediaCount % 50 === 0) {
            console.log("[deepgram] sending audio bytes:", audio.length);
          }
          const ab = audio.buffer.slice(
            audio.byteOffset,
            audio.byteOffset + audio.byteLength,
          );
          dg!.send(ab);
        } catch (err) {
          console.error("[deepgram] send error:", err);
        }
        return;
      }
      if (event === "stop") {
        console.log("[twilio] STOP received — closing DG");
        clearIdleTimer();
        dgStopped = true;
        if (dgReconnectTimer) {
          clearTimeout(dgReconnectTimer);
          dgReconnectTimer = null;
        }
        const sid = state.streamSid || (msg.stop?.streamSid ?? "");
        const estimatedDurationMs = state.totalFrames * MS_PER_MEDIA_FRAME;
        const mediaToDgOpen =
          twilioMediaFirstSeenTs != null && deepgramOpenTs != null
            ? deepgramOpenTs - twilioMediaFirstSeenTs
            : null;
        const dgOpenToFirstTranscript =
          deepgramOpenTs != null && firstTranscriptTs != null
            ? firstTranscriptTs - deepgramOpenTs
            : null;
        const transcriptToCoachFirstDelta =
          firstTranscriptTs != null && firstCoachDeltaTs != null
            ? firstCoachDeltaTs - firstTranscriptTs
            : null;
        const total =
          twilioMediaFirstSeenTs != null && firstCoachDeltaTs != null
            ? firstCoachDeltaTs - twilioMediaFirstSeenTs
            : null;
        console.log(
          "[timing] media->dgOpen=",
          mediaToDgOpen ?? "n/a",
          "ms dgOpen->firstTranscript=",
          dgOpenToFirstTranscript ?? "n/a",
          "ms transcript->coachFirstDelta=",
          transcriptToCoachFirstDelta ?? "n/a",
          "ms total=",
          total ?? "n/a",
          "ms",
        );
        console.log(
          [sid, state.totalFrames, state.totalBytes, estimatedDurationMs].join(
            ", ",
          ),
        );
        if (dg) {
          try {
            (dg as { requestClose?: () => void }).requestClose?.();
          } catch (_) {}
          dg = null;
        }
        ws.close();
      }
    });

    ws.on("close", () => {
      dgStopped = true;
      if (dgReconnectTimer) {
        clearTimeout(dgReconnectTimer);
        dgReconnectTimer = null;
      }
      if (pauseTimer) {
        clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      if (intervalTimer) {
        clearInterval(intervalTimer);
        intervalTimer = null;
      }
      if (coachAbortController) {
        coachAbortController.abort();
        coachAbortController = null;
      }
      clearIdleTimer();
      if (dg) {
        try {
          (dg as { requestClose?: () => void }).requestClose?.();
        } catch (_) {}
        dg = null;
      }
    });
  });

  server.listen(8787, "0.0.0.0", () => {
    console.log("[gateway] running on port 8787 (0.0.0.0)");
    console.log(
      "[boot] DEEPGRAM_API_KEY present:",
      Boolean(process.env.DEEPGRAM_API_KEY),
      "len:",
      process.env.DEEPGRAM_API_KEY?.length ?? 0,
    );
    console.log(`realtime-gateway listening on port ${PORT}`);
  });
}

runServer();
