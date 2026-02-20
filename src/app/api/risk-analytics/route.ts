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
      return 2;
    case "low":
    default:
      return 1;
  }
}

export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - DAYS);
    const sinceIso = since.toISOString();

    const { data: rows, error } = await supabase
      .from("call_events")
      .select("call_id, timestamp, rolling_escalation_risk, rolling_complaint_risk, escalation_level, detected_triggers")
      .gte("timestamp", sinceIso)
      .order("timestamp", { ascending: true })
      .limit(10000);

    if (error) {
      console.error("[risk-analytics] Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const events = (rows ?? []) as {
      call_id: string;
      timestamp: string;
      rolling_escalation_risk: number;
      rolling_complaint_risk: number;
      escalation_level: string;
      detected_triggers: string[];
    }[];

    if (events.length === 0) {
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
      return NextResponse.json(empty);
    }

    const uniqueCallIds = new Set(events.map((e) => e.call_id));
    const totalCalls = uniqueCallIds.size;

    const maxLevelByCall = new Map<string, number>();
    for (const e of events) {
      const rank = levelRank(e.escalation_level);
      const current = maxLevelByCall.get(e.call_id) ?? 0;
      if (rank > current) maxLevelByCall.set(e.call_id, rank);
    }
    const levelsArray = Array.from(maxLevelByCall.values());

    const highOrCriticalCalls = levelsArray.filter((level) => {
      return level >= 3;
    }).length;

    const escalationRate =
      totalCalls > 0
        ? (100 * highOrCriticalCalls) / totalCalls
        : 0;

    const sumEsc = events.reduce((a, e) => a + (e.rolling_escalation_risk ?? 0), 0);
    const sumCompl = events.reduce((a, e) => a + (e.rolling_complaint_risk ?? 0), 0);
    const avgEscalationRisk = events.length ? sumEsc / events.length : 0;
    const avgComplaintRisk = events.length ? sumCompl / events.length : 0;

    const dist = { low: 0, moderate: 0, high: 0, critical: 0 };
    for (const e of events) {
      const level = String(e.escalation_level ?? "").toLowerCase();
      if (level === "low") dist.low++;
      else if (level === "moderate") dist.moderate++;
      else if (level === "high") dist.high++;
      else if (level === "critical") dist.critical++;
    }

    const byDate = new Map<string, { sum: number; count: number }>();
    for (const e of events) {
      const key = toDateKey(e.timestamp);
      const cur = byDate.get(key) ?? { sum: 0, count: 0 };
      cur.sum += e.rolling_escalation_risk ?? 0;
      cur.count += 1;
      byDate.set(key, cur);
    }
    const trend: { date: string; avgRisk: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toDateKey(d.toISOString());
      const cur = byDate.get(key);
      trend.push({
        date: key,
        avgRisk: cur ? cur.sum / cur.count : 0,
      });
    }

    const triggerCounts = new Map<string, number>();
    for (const e of events) {
      const triggers = Array.isArray(e.detected_triggers)
        ? e.detected_triggers
        : [];
      for (const t of triggers) {
        const s = String(t).trim();
        if (!s) continue;
        triggerCounts.set(s, (triggerCounts.get(s) ?? 0) + 1);
      }
    }
    const topTriggers = Array.from(triggerCounts.entries())
      .map(([trigger, count]) => ({ trigger, count }))
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
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error("[risk-analytics] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}
