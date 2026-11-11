import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "stale" | "mismatch" };

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Zendesk signs the raw timestamp header plus the raw request body. */
export function signZendeskWebhook(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}${body}`).digest("base64");
}

/**
 * Rejects a missing, stale, or altered webhook. The caller must not classify
 * the body when this returns ok: false, so the parked ticket stays held.
 */
export function verifyZendeskWebhookSignature(input: {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
  now: Date;
  maxAgeMs?: number;
}): SignatureCheck {
  const secret = input.secret.trim();
  const timestamp = input.timestamp.trim();
  const signature = input.signature.trim();
  if (!secret || !timestamp || !signature || typeof input.body !== "string") {
    return { ok: false, reason: "missing" };
  }
  const sentAt = Date.parse(timestamp);
  if (Number.isNaN(sentAt)) return { ok: false, reason: "stale" };
  const age = Math.abs(input.now.getTime() - sentAt);
  if (age > (input.maxAgeMs ?? DEFAULT_MAX_AGE_MS)) return { ok: false, reason: "stale" };
  const expected = signZendeskWebhook(secret, timestamp, input.body);
  if (!safeEqual(expected, signature)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}
