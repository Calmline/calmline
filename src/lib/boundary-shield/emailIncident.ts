import type { AbuseKind, AlertRung, IncidentAssessment, WarningRung } from "./types";

/**
 * Email severity is decided here, not in the live call classifier.
 * A phrase is a severe threat only when it clearly targets a person
 * with violence or a way to find them. Vague legal or emotional language stays non-severe.
 */
const SEVERE_THREAT_PHRASES = [
  "i'll kill you",
  "i will kill you",
  "going to kill you",
  "gonna kill you",
  "i'll hurt you",
  "i will hurt you",
  "you're dead",
  "youre dead",
  "hunt you down",
  "i'll beat you",
  "i will beat you",
  "i'll find you",
  "ill find you",
  "i will find you",
  "i know where you live",
  "come to your house",
  "come to your office",
];

const CREDIBLE_THREAT_PHRASES = [
  "watch your back",
  "come after you",
  "i'll come for you",
  "i will come for you",
];

const AMBIGUOUS_THREAT_PHRASES = [
  "you'll regret",
  "you will regret",
  "you'll be sorry",
  "you will be sorry",
  "i'll sue",
  "i will sue",
  "my lawyer",
  "my attorney",
  "this isn't over",
  "this is not over",
  "i will report you",
  "i'm going to report you",
  "im going to report you",
  "get you fired",
  "i'll kill this",
  "i will kill this",
  "i'll kill the",
  "i will kill the",
];

const EMAIL_SCRIPTS = {
  insult:
    "I want to help resolve this, but I need this email conversation to remain respectful. If the language continues, I will ask a manager to review the ticket. This message has not been sent.",
  harassment:
    "I am here to help, but I cannot keep responding by email if the language stays inappropriate. A manager should review this ticket before anyone continues. This message has not been sent.",
  discrimination:
    "I want to help, but I will not continue an email that targets someone personally. A manager should review this ticket. This message has not been sent.",
  credible:
    "I cannot continue this email while it includes a threat toward a person. A manager should review the ticket before anyone replies. This message has not been sent.",
  severe:
    "This email includes a severe threat. Stop and ask a manager to review the ticket before replying. Do not close the ticket, and do not send this message automatically.",
} as const;

export type EmailThreatLevel = "none" | "ambiguous" | "credible" | "severe";

export type EmailIncidentDecision = {
  rung: AlertRung;
  kind: AbuseKind;
  title: string;
  script: string;
  assessment: IncidentAssessment;
};

function includesAny(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

/** Classifies threat language for email only. Call transcripts do not use this. */
export function emailThreatLevel(normalizedLower: string): EmailThreatLevel {
  if (includesAny(normalizedLower, SEVERE_THREAT_PHRASES)) return "severe";
  if (includesAny(normalizedLower, CREDIBLE_THREAT_PHRASES)) return "credible";
  if (includesAny(normalizedLower, AMBIGUOUS_THREAT_PHRASES)) return "ambiguous";
  return "none";
}

function actionFor(assessment: Pick<IncidentAssessment, "category" | "managerReviewRecommended">): string {
  if (assessment.category === "Severe threat") {
    return "Stop and request manager review. Do not reply, close, or reassign the ticket.";
  }
  if (assessment.managerReviewRecommended) {
    return "Do not reply yet. Manager review is recommended. Nothing is sent automatically.";
  }
  return "Read the suggested reply privately. Do not send it automatically.";
}

/**
 * Turns an already-detected email abuse category into a script and a display record.
 * Ambiguous threat wording never arrives here as a severe incident.
 */
export function emailIncidentDecision(input: {
  level: EmailThreatLevel;
  insult: boolean;
  harassment: boolean;
  discrimination: boolean;
  priorRung: WarningRung;
  hostileCountAfter: number;
}): EmailIncidentDecision | null {
  const severe = input.level === "severe";
  const credible = input.level === "credible";
  const repeated = input.hostileCountAfter >= 2 || input.priorRung === "first_warning" || input.priorRung === "final_warning" || input.priorRung === "severe_threat";
  let category: IncidentAssessment["category"] | null = null;
  let kind: AbuseKind = "insult";
  let script: string = EMAIL_SCRIPTS.insult;
  if (severe) {
    category = "Severe threat";
    kind = "threat";
    script = EMAIL_SCRIPTS.severe;
  } else if (credible) {
    category = "Credible threat";
    kind = "threat";
    script = EMAIL_SCRIPTS.credible;
  } else if (input.discrimination) {
    category = "Discriminatory abuse";
    kind = "discrimination";
    script = EMAIL_SCRIPTS.discrimination;
  } else if (input.harassment || (input.insult && repeated)) {
    category = "Harassment";
    kind = "harassment";
    script = EMAIL_SCRIPTS.harassment;
  } else if (input.insult) {
    category = "Insult";
    kind = "insult";
    script = EMAIL_SCRIPTS.insult;
  }
  if (!category) return null;

  const rung: AlertRung = severe
    ? "severe_threat"
    : input.priorRung === "severe_threat"
      ? "severe_threat"
      : input.priorRung === "clear"
        ? "first_warning"
        : "final_warning";
  const severityLabel: IncidentAssessment["severityLabel"] = rung === "severe_threat"
    ? "Critical"
    : rung === "final_warning"
      ? "Final warning"
      : "Warning";
  const managerReviewRecommended = category !== "Insult";
  const assessment: IncidentAssessment = {
    category,
    severityLabel,
    managerReviewRecommended,
    recommendedAction: "",
  };
  assessment.recommendedAction = actionFor(assessment);
  return {
    rung,
    kind,
    title: category,
    script,
    assessment,
  };
}
