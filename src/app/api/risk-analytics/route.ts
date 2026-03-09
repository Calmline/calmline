import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DAYS = 30;

export type RiskAnalyticsResponse = {
  totalCalls: number;
  escalationRate: number;
  avgEscalationRisk: number;
  avgComplaintRisk: number;
  escalationDistribution: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  trend: { date: string; avgRisk: number }[];
  topTriggers: { trigger: string; count: number }[];
  // Additional fields for richer analytics (used by /risk-analytics page)
  avgCallDuration?: number;
  riskCounts?: {
    low: number;
    medium: number;
    high: number;
    unknown: number;
  };
  toneCounts?: Record<string, number>;
  outcomeCounts?: {
    resolved: number;
    escalated: number;
    followUpNeeded: number;
    unknown: number;
  };
  dispositionCounts?: {
    billingIssue: number;
    refundRequest: number;
    managerEscalation: number;
    cancellationRequest: number;
    accountSupport: number;
    generalSupport: number;
  };
};

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function levelRank(level: string): number {
  switch (String(level).toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "moderate":
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

type SessionRow = {
  id: string;
  duration_seconds: number | null;
  escalation_risk: string | null;
  conversation_state: string | null;
  transcript: string | null;
  created_at: string;
};

type DispositionKey =
  | "billingIssue"
  | "refundRequest"
  | "managerEscalation"
  | "cancellationRequest"
  | "accountSupport"
  | "generalSupport";

function isValidSession(row: SessionRow): boolean {
  const duration = row.duration_seconds ?? 0;
  const transcript = (row.transcript ?? "").trim();
  const hasContent = transcript.length > 0;
  const hasDuration = duration > 0;
  return hasContent || hasDuration;
}

function classifyRiskLevel(escalation_risk: string | null): "low" | "moderate" | "high" | "critical" | "unknown" {
  const v = (escalation_risk ?? "").toLowerCase();
  if (!v) return "unknown";
  if (v.includes("critical")) return "critical";
  if (v.includes("high")) return "high";
  if (v.includes("medium") || v.includes("moderate")) return "moderate";
  if (v.includes("low")) return "low";
  return "unknown";
}

function normalizeTone(state: string | null): string {
  const raw = (state ?? "").trim();
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("neutral") || lower.includes("calm") || lower.includes("stable")) return "Neutral";
  if (lower.includes("positive")) return "Positive";
  if (
    lower.includes("negative") ||
    lower.includes("angry") ||
    lower.includes("upset") ||
    lower.includes("abusive") ||
    lower.includes("escalating") ||
    lower.includes("confrontational")
  ) {
    return "Negative";
  }
  return raw;
}

function deriveOutcome(row: SessionRow): "Resolved" | "Escalated" | "Follow-Up Needed" | "Unknown" {
  const level = classifyRiskLevel(row.escalation_risk);
  if (level === "high" || level === "critical") return "Escalated";
  if (level === "moderate") return "Follow-Up Needed";
  if (level === "low") return "Resolved";
  return "Unknown";
}

function deriveDisposition(row: SessionRow): DispositionKey {
  const base = (row.transcript || "").toLowerCase();
  if (base.includes("refund") || base.includes("chargeback")) return "refundRequest";
  if (base.includes("billing") || base.includes("invoice")) return "billingIssue";
  if (base.includes("manager") || base.includes("supervisor")) return "managerEscalation";
  if (base.includes("cancel") || base.includes("cancellation")) return "cancellationRequest";
  if (base.includes("account") || base.includes("login")) return "accountSupport";
  return "generalSupport";
}

export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - DAYS);
    const sinceIso = since.toISOString();

    const { data: rows, error } = await supabase
      .from("call_sessions")
      .select(
        "id, duration_seconds, escalation_risk, conversation_state, transcript, created_at"
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (error) {
      console.error("[risk-analytics] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load risk analytics" },
        { status: 500 }
      );
    }

    const sessions = (rows ?? []) as SessionRow[];
    console.log("[risk-analytics] raw sessions:", sessions.length);

    if (sessions.length === 0) {
      const emptyTrend: { date: string; avgRisk: number }[] = [];
      for (let i = DAYS - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        emptyTrend.push({ date: toDateKey(d.toISOString()), avgRisk: 0 });
      }
      const empty: RiskAnalyticsResponse = {
        totalCalls: 0,
        escalationRate: 0,
        avgEscalationRisk: 0,
        avgComplaintRisk: 0,
        escalationDistribution: { low: 0, moderate: 0, high: 0, critical: 0 },
        trend: emptyTrend,
        topTriggers: [],
      };
      console.log("[risk-analytics] valid sessions:", 0);
      console.log("[risk-analytics] payload:", empty);
      return NextResponse.json(empty);
    }

    const validSessions = sessions.filter(isValidSession);
    console.log("[risk-analytics] valid sessions:", validSessions.length);

    const totalCalls = validSessions.length;

    let totalDuration = 0;
    const dist = { low: 0, moderate: 0, high: 0, critical: 0 };
    const riskCounts = { low: 0, medium: 0, high: 0, unknown: 0 };
    const toneCounts: Record<string, number> = {};
    const outcomeCounts = {
      resolved: 0,
      escalated: 0,
      followUpNeeded: 0,
      unknown: 0,
    };
    const dispositionCounts: Record<DispositionKey, number> = {
      billingIssue: 0,
      refundRequest: 0,
      managerEscalation: 0,
      cancellationRequest: 0,
      accountSupport: 0,
      generalSupport: 0,
    };

    const byDate = new Map<string, { sum: number; count: number }>();

    for (const row of validSessions) {
      const duration = row.duration_seconds ?? 0;
      totalDuration += duration;

      const level = classifyRiskLevel(row.escalation_risk);
      if (level === "low") {
        dist.low++;
        riskCounts.low++;
      } else if (level === "moderate") {
        dist.moderate++;
        riskCounts.medium++;
      } else if (level === "high") {
        dist.high++;
        riskCounts.high++;
      } else if (level === "critical") {
        dist.critical++;
        riskCounts.high++;
      } else {
        riskCounts.unknown++;
      }

      const toneLabel = normalizeTone(row.conversation_state);
      toneCounts[toneLabel] = (toneCounts[toneLabel] ?? 0) + 1;

      const outcome = deriveOutcome(row);
      if (outcome === "Resolved") outcomeCounts.resolved++;
      else if (outcome === "Escalated") outcomeCounts.escalated++;
      else if (outcome === "Follow-Up Needed") {
        outcomeCounts.followUpNeeded++;
      } else {
        outcomeCounts.unknown++;
      }

      const dispositionKey = deriveDisposition(row);
      dispositionCounts[dispositionKey]++;

      const dateKey = toDateKey(row.created_at);
      const current = byDate.get(dateKey) ?? { sum: 0, count: 0 };
      const rank = levelRank(level);
      current.sum += rank;
      current.count += 1;
      byDate.set(dateKey, current);
    }

    const avgCallDuration =
      totalCalls > 0 ? totalDuration / totalCalls : 0;

    const highOrCriticalCalls = dist.high + dist.critical;
    const escalationRate =
      totalCalls > 0 ? (100 * highOrCriticalCalls) / totalCalls : 0;

    // Map ranked levels (1–4) to a 0–100 scale for avgEscalationRisk
    let totalRank = 0;
    let rankCount = 0;
    for (const row of validSessions) {
      const level = classifyRiskLevel(row.escalation_risk);
      const rank = levelRank(level);
      totalRank += rank;
      rankCount += 1;
    }
    const avgRank = rankCount ? totalRank / rankCount : 0;
    const avgEscalationRisk = avgRank * 25;

    // Simple complaint risk proxy: share of sessions with billing/refund/cancellation dispositions
    const complaintCount =
      dispositionCounts.billingIssue +
      dispositionCounts.refundRequest +
      dispositionCounts.cancellationRequest;
    const avgComplaintRisk =
      totalCalls > 0
        ? (100 * complaintCount) / totalCalls
        : 0;

    const trend: { date: string; avgRisk: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toDateKey(d.toISOString());
      const cur = byDate.get(key);
      const avg = cur && cur.count > 0 ? (cur.sum / cur.count) * 25 : 0;
      trend.push({ date: key, avgRisk: avg });
    }

    const dispositionTriggerEntries: { trigger: string; count: number }[] = [
      { trigger: "Billing issue", count: dispositionCounts.billingIssue },
      { trigger: "Refund request", count: dispositionCounts.refundRequest },
      {
        trigger: "Manager escalation",
        count: dispositionCounts.managerEscalation,
      },
      {
        trigger: "Cancellation request",
        count: dispositionCounts.cancellationRequest,
      },
      { trigger: "Account support", count: dispositionCounts.accountSupport },
      { trigger: "General support", count: dispositionCounts.generalSupport },
    ].filter((x) => x.count > 0);

    const topTriggers = dispositionTriggerEntries
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const body: RiskAnalyticsResponse = {
      totalCalls,
      escalationRate: Math.round(escalationRate * 10) / 10,
      avgEscalationRisk: Math.round(avgEscalationRisk * 10) / 10,
      avgComplaintRisk: Math.round(avgComplaintRisk * 10) / 10,
      escalationDistribution: dist,
      trend,
      topTriggers,
      avgCallDuration,
      riskCounts,
      toneCounts,
      outcomeCounts,
      dispositionCounts,
    };
    console.log("[risk-analytics] payload:", body);
    return NextResponse.json(body);
  } catch (err) {
    console.error("[risk-analytics] Error:", err);
    return NextResponse.json(
      { error: "Failed to load risk analytics" },
      { status: 500 }
    );
  }
}
