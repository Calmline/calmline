/**
 * Classification rules for escalation triggers.
 * Maps phrases (risk drivers / detected_triggers) into canonical categories
 * for the proprietary escalation dataset.
 */

import type { EscalationCategory } from "./escalation-types";

/** Keywords/phrases that indicate each category (lowercase for matching). */
const TRIGGER_RULES: Record<
  EscalationCategory,
  { keywords: string[]; phrases: string[] }
> = {
  manager_request: {
    keywords: ["manager", "supervisor", "escalat", "speak to someone", "human", "real person", "higher", "boss", "complaint department"],
    phrases: [
      "request for manager",
      "want to speak to manager",
      "get me a manager",
      "transfer to supervisor",
      "escalate to manager",
      "speak with supervisor",
      "need a manager",
      "manager request",
      "supervisor request",
    ],
  },
  legal_threat: {
    keywords: ["lawyer", "attorney", "sue", "legal", "court", "law suit", "litigation", "bbb", "regulator", "report you", "consumer protection", "legal action", "taking legal"],
    phrases: [
      "legal threat",
      "threaten to sue",
      "contact lawyer",
      "going to court",
      "report to bbb",
      "legal action",
      "sue the company",
    ],
  },
  refund_demand: {
    keywords: ["refund", "money back", "chargeback", "dispute", "cancel", "reimburse", "credit back", "full refund", "partial refund", "demand refund"],
    phrases: [
      "refund demand",
      "want a refund",
      "demand refund",
      "give me my money back",
      "issue a refund",
      "refund request",
      "chargeback",
    ],
  },
  repeated_contact_frustration: {
    keywords: ["again", "multiple", "third time", "fourth time", "called before", "already called", "keep calling", "no resolution", "runaround", "transferred", "back and forth", "waste", "frustrat", "same issue", "still not", "never resolved", "going in circles"],
    phrases: [
      "repeated contact",
      "multiple contacts",
      "called multiple times",
      "no resolution",
      "runaround",
      "transferred multiple times",
      "repeated contact frustration",
      "same issue unresolved",
    ],
  },
  policy_resistance: {
    keywords: ["policy", "against policy", "can't do", "cannot do", "not allowed", "rules", "exception", "make an exception", "unfair", "ridiculous", "your policy", "company policy", "not my problem", "that's your policy", "policy says", "refuse to", "won't do"],
    phrases: [
      "policy resistance",
      "against policy",
      "request exception",
      "policy complaint",
      "unfair policy",
      "refuse to accept policy",
      "policy pushback",
    ],
  },
};

const CATEGORY_LABELS: Record<EscalationCategory, string> = {
  manager_request: "Manager requests",
  legal_threat: "Legal threats",
  refund_demand: "Refund demands",
  repeated_contact_frustration: "Repeated contact frustration",
  policy_resistance: "Policy resistance",
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Classify a single trigger phrase into one of the five escalation categories.
 * Returns the first matching category or null if none match.
 */
export function classifyTrigger(phrase: string): EscalationCategory | null {
  const n = normalize(phrase);
  if (!n) return null;

  const order: EscalationCategory[] = [
    "legal_threat",
    "manager_request",
    "refund_demand",
    "repeated_contact_frustration",
    "policy_resistance",
  ];
  for (const cat of order) {
    const { keywords, phrases } = TRIGGER_RULES[cat];
    for (const p of phrases) {
      if (n.includes(normalize(p))) return cat;
    }
    for (const kw of keywords) {
      if (n.includes(kw)) return cat;
    }
  }
  return null;
}

export function getCategoryLabel(cat: EscalationCategory): string {
  return CATEGORY_LABELS[cat];
}

export { CATEGORY_LABELS, TRIGGER_RULES };
