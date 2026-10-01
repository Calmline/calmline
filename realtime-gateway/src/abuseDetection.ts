/**
 * Boundary Shield classifier: agent-directed abuse vs normal frustration.
 * Detection is rule-based. Callers of this module own websocket/script dispatch.
 */

export type AbusiveSeverity =
  | "warning_needed"
  | "final_warning"
  | "terminate_call"
  | "severe";

export type AbuseDetectionResult = {
  abusiveDetected: boolean;
  severity: AbusiveSeverity;
  allowTerminationScript: boolean;
};

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

const DIRECTED_PROFANITY_PHRASES = [
  "fuck you",
  "screw you",
  "damn you",
  "piss off",
  "go to hell",
  "eat shit",
  "kiss my ass",
  "fuck off",
  "shut the hell up",
  "up yours",
  "eat a dick",
];

/** Personal attacks on the agent (not “your company / this policy”). */
const PERSONAL_ATTACK_PHRASES = [
  "you're stupid",
  "youre stupid",
  "you're an idiot",
  "youre an idiot",
  "you idiot",
  "you stupid",
  "you're useless",
  "youre useless",
  "you're pathetic",
  "youre pathetic",
  "you're worthless",
  "youre worthless",
  "you're incompetent",
  "youre incompetent",
  "you're a jerk",
  "youre a jerk",
  "you jerk",
  "stupid rep",
  "idiot rep",
  "dumb rep",
  "stupid agent",
  "idiot agent",
  "shut up",
  "shut it",
  "i hate you",
  "you moron",
  "you asshole",
  "you're an asshole",
  "youre an asshole",
];

/** Violence / intimidation toward the person on the line — not legal escalation. */
const THREAT_PHRASES = [
  "i'll kill",
  "i will kill",
  "going to kill you",
  "gonna kill you",
  "i'll hurt you",
  "i will hurt you",
  "you're dead",
  "youre dead",
  "come after you",
  "hunt you down",
  "i'll beat you",
  "i will beat you",
  "i'll find you",
  "ill find you",
  "i will find you",
  "watch your back",
  "i know where you live",
  "come to your house",
  "come to your office",
];

const DIRECTED_PROFANITY_PATTERNS = [
  /\b(fuck|screw|damn|shit)\s+you\b/i,
  /\byou\s+(fucking\s+)?(stupid|idiot|asshole|moron|jerk|bastard|worthless|useless)\b/i,
  /\byou\s+piece\s+of\s+(shit|crap)\b/i,
];

function splitUtterances(text: string): string[] {
  return text
    .split(/[\n.!?]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function hasDirectedProfanity(sentence: string): boolean {
  if (includesAny(sentence, DIRECTED_PROFANITY_PHRASES)) return true;
  if (DIRECTED_PROFANITY_PATTERNS.some((re) => re.test(sentence))) return true;
  return false;
}

function hasPersonalAttack(sentence: string): boolean {
  if (includesAny(sentence, PERSONAL_ATTACK_PHRASES)) return true;
  return /\byou(?:'re|re|\s+are)\s+(an?\s+)?(so\s+)?(stupid|idiot|pathetic|worthless|useless|incompetent|dumb|moron)\b/i.test(
    sentence,
  );
}

function hasThreat(sentence: string): boolean {
  return includesAny(sentence, THREAT_PHRASES);
}

/**
 * Classify rolling live transcript for Boundary Shield.
 * Does not suppress because the topic is billing/refunds/login.
 * Does not treat general anger or undirected swearing as abuse.
 */
export function detectAbusiveLanguage(
  transcript: string,
  lastScriptSent?: "warning_needed" | "final_warning" | null,
): AbuseDetectionResult {
  const none: AbuseDetectionResult = {
    abusiveDetected: false,
    severity: "warning_needed",
    allowTerminationScript: false,
  };
  const lower = transcript.toLowerCase().trim();
  if (!lower) return none;

  const utterances = splitUtterances(lower);
  const units = utterances.length > 0 ? utterances : [lower];

  let threatHits = 0;
  let attackHits = 0;
  let directedProfanityHits = 0;
  let hostileUtterances = 0;

  for (const u of units) {
    const threat = hasThreat(u);
    const attack = hasPersonalAttack(u);
    const directedProfanity = hasDirectedProfanity(u);
    if (threat) threatHits += 1;
    if (attack) attackHits += 1;
    if (directedProfanity) directedProfanityHits += 1;
    if (threat || attack || directedProfanity) hostileUtterances += 1;
  }

  // Phrases can span a period (“I'll find you.”) — also scan the full window.
  if (includesAny(lower, THREAT_PHRASES)) threatHits = Math.max(threatHits, 1);
  if (includesAny(lower, PERSONAL_ATTACK_PHRASES)) {
    attackHits = Math.max(attackHits, 1);
  }
  if (
    includesAny(lower, DIRECTED_PROFANITY_PHRASES) ||
    DIRECTED_PROFANITY_PATTERNS.some((re) => re.test(lower))
  ) {
    directedProfanityHits = Math.max(directedProfanityHits, 1);
  }

  const threat = threatHits > 0;
  const personalAttack = attackHits > 0;
  const directedProfanity = directedProfanityHits > 0;
  const sustained = hostileUtterances >= 2;
  const stillHostile = threat || personalAttack || directedProfanity;

  if (!stillHostile) return none;

  if (lastScriptSent === "final_warning") {
    return {
      abusiveDetected: true,
      severity: "terminate_call",
      allowTerminationScript: true,
    };
  }
  if (lastScriptSent === "warning_needed") {
    return {
      abusiveDetected: true,
      severity: "final_warning",
      allowTerminationScript: true,
    };
  }

  if (threat) {
    return {
      abusiveDetected: true,
      severity: "severe",
      allowTerminationScript: true,
    };
  }

  // First directed insult or “fuck you”-class language: activate.
  // Sustained directed hostility (two+ hostile utterances) also activates.
  const strongDirected = personalAttack || directedProfanity;
  const allowTerminationScript = strongDirected || sustained;

  return {
    abusiveDetected: true,
    severity: "warning_needed",
    allowTerminationScript,
  };
}

/** Operational topic helper for coaching tone — not a Boundary Shield suppressor. */
export function isServiceProblemContext(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return false;
  return SERVICE_PROBLEM_SIGNALS.some((signal) => lower.includes(signal));
}

const SERVICE_PROBLEM_SIGNALS = [
  "billing",
  "bill",
  "charged",
  "charge",
  "duplicate charge",
  "double charge",
  "login",
  "log in",
  "logged in",
  "password",
  "account",
  "can't log",
  "error",
  "error message",
  "something went wrong",
  "not working",
  "broken",
  "refund",
  "dispute",
  "incorrect charge",
  "wrong amount",
  "missing payment",
];
