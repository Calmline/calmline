/**
 * TEMPORARY — Boundary Shield test mode.
 * Delete this file and the /dev/boundary-shield-test route when finished testing.
 *
 * Feeds phrases through detectAbusiveLanguage() and the same broadcastToUI
 * events as a live Deepgram final + abusive-script coach path.
 * Disabled when NODE_ENV=production unless BOUNDARY_SHIELD_TEST_MODE=1.
 */

import type { IncomingMessage, ServerResponse } from "http";
import { detectAbusiveLanguage } from "./abuseDetection";

type AbusiveSeverity = "warning_needed" | "final_warning" | "terminate_call" | "severe";

type BroadcastToUI = (type: string, payload?: Record<string, unknown>) => void;

const ROLLING_TRANSCRIPT_MAX = 1200;

export function isBoundaryShieldTestModeEnabled(): boolean {
  if (process.env.BOUNDARY_SHIELD_TEST_MODE === "1") return true;
  if (process.env.BOUNDARY_SHIELD_TEST_MODE === "0") return false;
  return process.env.NODE_ENV !== "production";
}

let rollingTranscript = "";
let lastAbusiveScriptSent: "warning_needed" | "final_warning" | null = null;

function resetSession(): void {
  rollingTranscript = "";
  lastAbusiveScriptSent = null;
}

function ingestPhrase(
  phrase: string,
  broadcastToUI: BroadcastToUI,
  scripts: Record<AbusiveSeverity, string>,
): {
  abusiveDetected: boolean;
  severity: AbusiveSeverity;
  allowTerminationScript: boolean;
} {
  const text = phrase.trim();
  rollingTranscript = rollingTranscript ? `${rollingTranscript}\n${text}` : text;
  if (rollingTranscript.length > ROLLING_TRANSCRIPT_MAX) {
    rollingTranscript = rollingTranscript.slice(-ROLLING_TRANSCRIPT_MAX);
  }

  broadcastToUI("transcript", { text });

  const { abusiveDetected, severity, allowTerminationScript } =
    detectAbusiveLanguage(rollingTranscript, lastAbusiveScriptSent);

  // Same as Deepgram final-chunk path
  if (abusiveDetected) {
    broadcastToUI("risk_update", {
      score: 3,
      level: "HIGH",
      signals: ["abusive_language"],
    });
    broadcastToUI("conversation_state", {
      state: "ABUSIVE",
      strategy: "Firm boundary setting.",
    });
  }

  // Same as maybeTriggerCoach abusive-script path (debounce skipped for repeatable tests)
  if (abusiveDetected && allowTerminationScript) {
    const script = scripts[severity];
    broadcastToUI("coach_final", {
      coachId: Date.now(),
      messageId: Date.now(),
      text: script,
      message: script,
    });
    if (severity === "warning_needed" || severity === "final_warning") {
      lastAbusiveScriptSent = severity;
    }
  }

  return { abusiveDetected, severity, allowTerminationScript };
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString();
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

/**
 * @returns true if this request was handled (including 403/400).
 */
export async function tryHandleBoundaryShieldTestRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  broadcastToUI: BroadcastToUI,
  scripts: Record<AbusiveSeverity, string>,
): Promise<boolean> {
  if (pathname !== "/dev/boundary-shield-test" || req.method !== "POST") {
    return false;
  }

  const json = (body: unknown, status: number) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (!isBoundaryShieldTestModeEnabled()) {
    json({ ok: false, error: "Boundary Shield test mode is disabled" }, 403);
    return true;
  }

  try {
    const body = await readJsonBody(req);
    if (body.reset === true) {
      resetSession();
      console.log("[boundary-shield-test] session reset");
      json({ ok: true, reset: true }, 200);
      return true;
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      json({ ok: false, error: "text is required" }, 400);
      return true;
    }

    const result = ingestPhrase(text, broadcastToUI, scripts);
    console.log("[boundary-shield-test] ingested", {
      len: text.length,
      ...result,
    });
    json({ ok: true, ...result }, 200);
    return true;
  } catch (err) {
    console.error("[boundary-shield-test] invalid payload", err);
    json({ ok: false, error: "Invalid JSON payload" }, 400);
    return true;
  }
}
