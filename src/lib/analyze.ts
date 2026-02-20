import OpenAI from "openai";

export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";
export type CustomerSentiment =
  | "Calm"
  | "Frustrated"
  | "Angry"
  | "Escalating";
export type AgentTone =
  | "Professional"
  | "Neutral"
  | "Defensive"
  | "Empathetic";

export type ToneAnalysis = {
  customerSentiment: CustomerSentiment;
  agentTone: AgentTone;
  volatilityScore: number;
};

export type EscalationDeflectionOptions = {
  empatheticDelay: {
    acknowledgeRequest: string;
    reinforceOwnership: string;
    offerResolutionFirst: string;
  };
  managerUnavailableScript: {
    explainSupervisorAvailability: string;
    offerCallbackOption: string;
    offerInternalEscalationWithoutTransfer: string;
  };
  structuredContainment: {
    offerNextActionTimeline: string;
    offerReferenceNumber: string;
    offerFollowUpCommitment: string;
  };
};

export type AnalysisResult = {
  escalationRisk: number;
  escalationLevel: RiskLevel;
  complaintRisk: number;
  complaintLevel: RiskLevel;
  confidenceScore: number;
  riskDrivers: string[];
  toneAnalysis: ToneAnalysis;
  suggestedResponse: string;
  summary: string;
  escalationDeflectionOptions?: EscalationDeflectionOptions;
};

export type AnalysisData = AnalysisResult & { id: string; created_at: string };

const ESCALATION_KEYWORDS = [
  "manager",
  "supervisor",
  "escalate",
  "complaint",
  "speak to someone higher",
];

const MEDICAL_URGENT_KEYWORDS = [
  "cancer",
  "screening",
  "surgery",
  "surgical",
  "emergency",
  "medical",
  "health",
  "hospital",
  "doctor",
  "physician",
  "diagnosis",
  "treatment",
  "medication",
  "prescription",
  "urgent",
  "critical",
  "life-threatening",
  "pain",
  "bleeding",
  "chest pain",
  "stroke",
  "heart attack",
];

export function hasEscalationKeywords(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
}

export function hasMedicalOrUrgentKeywords(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  return MEDICAL_URGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

const EMPATHY_WEIGHTING_ADDON = `

This transcript may mention medical, health, or urgent topics. Prioritize empathy in your response:
- suggestedResponse: Lead with acknowledgment and care; use warmer, more supportive language.
- summary: Note any sensitivity around health/urgency.
- riskDrivers: Include emotional support as a consideration.
- Keep tone calm and reassuring while remaining accurate and helpful.`;

const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "High", "Critical"];
const CUSTOMER_SENTIMENTS: CustomerSentiment[] = [
  "Calm",
  "Frustrated",
  "Angry",
  "Escalating",
];
const AGENT_TONES: AgentTone[] = [
  "Professional",
  "Neutral",
  "Defensive",
  "Empathetic",
];

const SYSTEM_PROMPT = `You are a customer service risk analyst. Analyze the live transcript and respond with ONLY a single valid JSON object. No markdown, no commentary, no explanation.

Schema (exact keys):

{
  "escalationRisk": <number 0-100>,
  "escalationLevel": "<Low|Moderate|High|Critical>",
  "complaintRisk": <number 0-100>,
  "complaintLevel": "<Low|Moderate|High|Critical>",
  "confidenceScore": <number 0-100>,
  "riskDrivers": ["<string>", "<string>", "<string>"],
  "toneAnalysis": {
    "customerSentiment": "<Calm|Frustrated|Angry|Escalating>",
    "agentTone": "<Professional|Neutral|Defensive|Empathetic>",
    "volatilityScore": <number 0-100>
  },
  "suggestedResponse": "<string>",
  "summary": "<string>"
}

Constraints (prioritize speed and brevity):
- riskDrivers: max 3 short phrases. Tactical guidance only.
- suggestedResponse: max 2 sentences. What the agent could say next.
- summary: one short sentence.
- Levels: Low <25, Moderate 25-49, High 50-74, Critical 75+.
- Output only the JSON object.`;

const DEFLECTION_SCHEMA_ADDON = `

If the transcript suggests the customer is asking for a manager, supervisor, escalation, complaint, or to speak to someone higher, ALSO include this key in your JSON (same object, no extra wrapper):
"escalationDeflectionOptions": {
  "empatheticDelay": {
    "acknowledgeRequest": "<one short script line: acknowledge their request>",
    "reinforceOwnership": "<one short script line: reinforce that you own resolving this>",
    "offerResolutionFirst": "<one short script line: offer to resolve before escalating>"
  },
  "managerUnavailableScript": {
    "explainSupervisorAvailability": "<one short script line: explain supervisor availability without refusing>",
    "offerCallbackOption": "<one short script line: offer callback option>",
    "offerInternalEscalationWithoutTransfer": "<one short script line: offer internal escalation without live transfer>"
  },
  "structuredContainment": {
    "offerNextActionTimeline": "<one short script line: offer a clear next-action timeline>",
    "offerReferenceNumber": "<one short script line: offer a reference/case number>",
    "offerFollowUpCommitment": "<one short script line: commit to follow-up>"
  }
}

Tone for all deflection scripts: reduce confrontation, avoid refusal or dismissive tone, maintain authority and empathy. One sentence per value, agent-ready phrasing.`;

const REGENERATE_ADDON = `

This is a regenerate request. Provide an alternative approach with a different phrasing style. Avoid repeating prior structure. Do not reuse any cached or previous response; generate a fresh response.`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export class InvalidAIResponseError extends Error {
  constructor(message: string = "Invalid AI response format") {
    super(message);
    this.name = "InvalidAIResponseError";
  }
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(num)));
}

function ensureRiskLevel(v: string): RiskLevel {
  return RISK_LEVELS.includes(v as RiskLevel) ? (v as RiskLevel) : "Low";
}

function ensureSentiment(v: string): CustomerSentiment {
  return CUSTOMER_SENTIMENTS.includes(v as CustomerSentiment)
    ? (v as CustomerSentiment)
    : "Calm";
}

function ensureAgentTone(v: string): AgentTone {
  return AGENT_TONES.includes(v as AgentTone) ? (v as AgentTone) : "Neutral";
}

function parseDeflectionOptions(
  raw: unknown
): EscalationDeflectionOptions | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const ed = o.empatheticDelay as Record<string, unknown> | undefined;
  const mus = o.managerUnavailableScript as Record<string, unknown> | undefined;
  const sc = o.structuredContainment as Record<string, unknown> | undefined;
  if (!ed || !mus || !sc) return undefined;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");
  return {
    empatheticDelay: {
      acknowledgeRequest: str(ed.acknowledgeRequest),
      reinforceOwnership: str(ed.reinforceOwnership),
      offerResolutionFirst: str(ed.offerResolutionFirst),
    },
    managerUnavailableScript: {
      explainSupervisorAvailability: str(mus.explainSupervisorAvailability),
      offerCallbackOption: str(mus.offerCallbackOption),
      offerInternalEscalationWithoutTransfer: str(
        mus.offerInternalEscalationWithoutTransfer
      ),
    },
    structuredContainment: {
      offerNextActionTimeline: str(sc.offerNextActionTimeline),
      offerReferenceNumber: str(sc.offerReferenceNumber),
      offerFollowUpCommitment: str(sc.offerFollowUpCommitment),
    },
  };
}

export async function analyzeTranscript(
  transcript: string,
  options?: { regenerate?: boolean }
): Promise<AnalysisResult> {
  const regenerate = !!options?.regenerate;
  const includeDeflection = hasEscalationKeywords(transcript);
  const increaseEmpathy = hasMedicalOrUrgentKeywords(transcript);
  let systemPrompt = includeDeflection
    ? SYSTEM_PROMPT + DEFLECTION_SCHEMA_ADDON
    : SYSTEM_PROMPT;
  if (increaseEmpathy) {
    systemPrompt = systemPrompt + EMPATHY_WEIGHTING_ADDON;
  }
  if (regenerate) {
    systemPrompt = systemPrompt + REGENERATE_ADDON;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript || "(empty transcript)" },
    ],
    response_format: { type: "json_object" },
    temperature: regenerate ? 0.7 : 0.2,
    max_tokens: Math.max(200, includeDeflection ? 950 : 600),
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    console.error("[analyze] Empty response from OpenAI");
    throw new InvalidAIResponseError();
  }

  console.log("[analyze] Raw AI output (pre-parse):", raw);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (parseErr) {
    console.error("[analyze] JSON parse failed:", parseErr);
    console.error("[analyze] Raw content that failed to parse:", raw);
    throw new InvalidAIResponseError();
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.error("[analyze] AI response is not a JSON object:", typeof parsed);
    throw new InvalidAIResponseError();
  }

  try {
    const toneAnalysisRaw = parsed.toneAnalysis as Record<string, unknown> | undefined;
    const escalationRisk = clamp(Number(parsed.escalationRisk ?? 0), 0, 100);
    const complaintRisk = clamp(Number(parsed.complaintRisk ?? 0), 0, 100);
    const confidenceScore = clamp(Number(parsed.confidenceScore ?? 0), 0, 100);
    const volatilityScore = clamp(
      Number(toneAnalysisRaw?.volatilityScore ?? 0),
      0,
      100
    );

    const riskDrivers = Array.isArray(parsed.riskDrivers)
      ? (parsed.riskDrivers as string[]).slice(0, 3).filter((s) => typeof s === "string")
      : [];

    const toneAnalysis = toneAnalysisRaw ?? {};
    const tone: ToneAnalysis = {
      customerSentiment: ensureSentiment(String(toneAnalysis.customerSentiment ?? "Calm")),
      agentTone: ensureAgentTone(String(toneAnalysis.agentTone ?? "Neutral")),
      volatilityScore,
    };

    const escalationDeflectionOptions = includeDeflection
      ? parseDeflectionOptions(parsed.escalationDeflectionOptions)
      : undefined;

    return {
      escalationRisk,
      escalationLevel: ensureRiskLevel(String(parsed.escalationLevel ?? "Low")),
      complaintRisk,
      complaintLevel: ensureRiskLevel(String(parsed.complaintLevel ?? "Low")),
      confidenceScore,
      riskDrivers,
      toneAnalysis: tone,
      suggestedResponse: String(parsed.suggestedResponse ?? "").slice(0, 500),
      summary: String(parsed.summary ?? "").slice(0, 300),
      escalationDeflectionOptions,
    };
  } catch (err) {
    if (err instanceof InvalidAIResponseError) throw err;
    console.error("[analyze] Validation/coercion error:", err);
    throw new InvalidAIResponseError();
  }
}
