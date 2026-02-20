/**
 * Live mode context: rolling buffer and trigger logic for real-time voice.
 * - Full transcript is kept in memory by the caller.
 * - Only the last N customer utterances are sent to the AI engine.
 * - Coaching is triggered on: new customer sentence, escalation spike, or urgent keywords.
 */

export const ROLLING_CUSTOMER_UTTERANCES = 8;
export const ESCALATION_SPIKE_PERCENT = 10;

export type Utterance = { speaker: "customer" | "agent"; text: string };

const SPEAKER_PREFIXES = [
  { pattern: /^\s*Customer:\s*/i, speaker: "customer" as const },
  { pattern: /^\s*Agent:\s*/i, speaker: "agent" as const },
];

/**
 * Splits transcript into utterances by "Customer:" and "Agent:" lines.
 * Lines without a prefix are attached to the previous utterance.
 */
export function parseUtterances(transcript: string): Utterance[] {
  const out: Utterance[] = [];
  const lines = transcript.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let current: Utterance | null = null;

  for (const line of lines) {
    let matched = false;
    for (const { pattern, speaker } of SPEAKER_PREFIXES) {
      const m = line.match(pattern);
      if (m) {
        const text = line.slice(m[0].length).trim();
        if (text) {
          current = { speaker, text };
          out.push(current);
        }
        matched = true;
        break;
      }
    }
    if (!matched && current) {
      current.text += " " + line.trim();
    }
  }

  return out;
}

/**
 * Returns the last N customer utterances with surrounding agent context
 * as a single transcript string for the AI. Uses at most ROLLING_CUSTOMER_UTTERANCES
 * customer turns.
 */
export function getRollingContext(
  transcript: string,
  maxCustomerUtterances: number = ROLLING_CUSTOMER_UTTERANCES
): string {
  const utterances = parseUtterances(transcript);
  const customerIndices: number[] = [];
  utterances.forEach((u, i) => {
    if (u.speaker === "customer") customerIndices.push(i);
  });
  // No Customer:/Agent: lines — use full transcript as context (e.g. pasted text).
  if (customerIndices.length === 0) return transcript.trim() || "";

  const startIdx = Math.max(
    0,
    customerIndices[Math.max(0, customerIndices.length - maxCustomerUtterances)]
  );
  const slice = utterances.slice(startIdx);
  return slice
    .map((u) => (u.speaker === "customer" ? `Customer: ${u.text}` : `Agent: ${u.text}`))
    .join("\n");
}

/**
 * Returns the last complete customer sentence (sentence ending in . ! ?).
 * If the last customer utterance has no sentence end, returns null.
 */
export function getLastCompleteCustomerSentence(transcript: string): string | null {
  const utterances = parseUtterances(transcript);
  const lastCustomer = [...utterances].reverse().find((u) => u.speaker === "customer");
  if (!lastCustomer?.text.trim()) return null;

  const t = lastCustomer.text.trim();
  const lastDot = t.lastIndexOf(".");
  const lastExcl = t.lastIndexOf("!");
  const lastQ = t.lastIndexOf("?");
  const lastIdx = Math.max(lastDot, lastExcl, lastQ);
  if (lastIdx < 0) return null;
  return t.slice(0, lastIdx + 1).trim();
}

/**
 * Urgent keywords: medical, legal, supervisor demand.
 * Triggers an immediate coaching update when detected in customer text.
 */
const URGENT_KEYWORDS = [
  "medical",
  "medicine",
  "hospital",
  "doctor",
  "lawsuit",
  "lawyer",
  "legal",
  "attorney",
  "sue",
  "supervisor",
  "manager",
  "speak to a manager",
  "speak to your supervisor",
  "demand to speak",
  "escalate",
  "escalation",
  "complaint",
  "lawyer",
  "suing",
];

export function hasUrgentKeywords(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return URGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns true if newEscalation is at least ESCALATION_SPIKE_PERCENT higher than previous.
 */
export function isEscalationSpike(
  previousRisk: number,
  newRisk: number,
  thresholdPercent: number = ESCALATION_SPIKE_PERCENT
): boolean {
  if (previousRisk >= 100) return false;
  return newRisk - previousRisk >= thresholdPercent;
}
