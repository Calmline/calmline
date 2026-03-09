"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PhoneCall,
  Shield,
  Gauge,
  Heart,
} from "lucide-react";

type CallHistoryRow = {
  id: string;
  created_at: string;
  session_id: string | null;
  transcript: string;
  ai_response: string;
  tone: string;
  escalation_risk: string;
  call_duration: number | null;
  ended_at: string | null;
};

export default function OverviewPage() {
  const [todayCount, setTodayCount] = useState(0);
  const [riskAvertedCount, setRiskAvertedCount] = useState(0);
  const [calmScore, setCalmScore] = useState(100);
  const [avgLatency, setAvgLatency] = useState(1.1);
  const [insight, setInsight] = useState("");
  const [aiInsight, setAiInsight] = useState("");
  const [aiSaves, setAiSaves] = useState(0);
  const [escalationForecast, setEscalationForecast] = useState<"Low" | "Rising" | "High">("Low");

  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/call-history");
      if (!res.ok) return;
      const data: CallHistoryRow[] = await res.json();

      const today = new Date().toISOString().slice(0, 10);
      const todaysSessions = (data ?? []).filter((session) =>
        (session.created_at || "").startsWith(today)
      );
      setTodayCount(todaysSessions.length);

      const riskAverted = (data ?? []).filter(
        (s) => (s.escalation_risk || "").toLowerCase() !== "high"
      );
      setRiskAvertedCount(riskAverted.length);

      let score = 100;
      (data ?? []).forEach((session) => {
        const risk = (session.escalation_risk || "").toLowerCase();
        if (risk === "high") score -= 12;
        if (risk === "medium") score -= 6;
      });
      if (score < 0) score = 0;
      setCalmScore(score);

      const responseTimes = (data ?? []).map((s) => s.call_duration || 0);
      const avgResponse =
        responseTimes.reduce((a, b) => a + b, 0) / (responseTimes.length || 1);
      setAvgLatency(
        responseTimes.length ? Math.round(avgResponse * 10) / 10 : 1.1
      );

      const triggers = {
        billing: 0,
        refund: 0,
        cancel: 0,
        manager: 0,
        complaint: 0,
        delay: 0,
      };
      (data ?? []).forEach((session) => {
        const text = (session.transcript || "").toLowerCase();
        if (text.includes("billing")) triggers.billing++;
        if (text.includes("refund")) triggers.refund++;
        if (text.includes("cancel")) triggers.cancel++;
        if (text.includes("manager")) triggers.manager++;
        if (text.includes("complaint")) triggers.complaint++;
        if (text.includes("delay")) triggers.delay++;
      });

      let saves = 0;
      (data ?? []).forEach((session) => {
        const risk = (session.escalation_risk || "").toLowerCase();
        if (risk === "medium" && session.ai_response) saves++;
      });
      setAiSaves(saves);

      let forecast: "Low" | "Rising" | "High" = "Low";
      if (triggers.manager > 3) forecast = "High";
      else if (triggers.refund + triggers.billing > 5) forecast = "Rising";
      setEscalationForecast(forecast);

      let insightText = "";
      const { billing, refund, cancel, manager } = triggers;
      if (billing > refund && billing > cancel) {
        insightText =
          "Billing disputes are currently the most common escalation trigger across recent calls.";
      } else if (refund > billing) {
        insightText =
          "Refund requests are driving the majority of escalation risk.";
      } else if (manager > 0) {
        insightText =
          "Customers are requesting managers more frequently during current sessions.";
      } else {
        insightText =
          "Customer sentiment across active sessions appears stable.";
      }
      setInsight(insightText);

      const aiInsightText =
        "Calmline AI responses helped de-escalate " +
        saves +
        " conversations.";
      setAiInsight(aiInsightText);
    } catch (err) {
      console.error("[overview] fetch metrics error:", err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardMetrics();
    const interval = setInterval(fetchDashboardMetrics, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardMetrics]);

  const metricCards = [
    {
      label: "Today's Sessions",
      value: String(todayCount),
      sub: "live calls",
      Icon: PhoneCall,
    },
    {
      label: "Escalation Risk Averted",
      value: String(riskAvertedCount),
      sub: "this week",
      Icon: Shield,
    },
    {
      label: "Calm Score",
      value: `${calmScore} / 100`,
      sub: "escalation outcomes",
      Icon: Heart,
    },
    {
      label: "AI Response Speed",
      value: `${avgLatency}s`,
      sub: "suggestion speed",
      Icon: Gauge,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Overview
        </h1>
        <p className="mt-1 text-sm text-slate-700">
          Real-time escalation prevention for customer support teams.
        </p>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {metricCards.map(({ label, value, sub, Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Icon className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      {/* Calmline Intelligence */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Calmline Intelligence
        </h2>
        <p className="text-sm text-slate-700">
          {insight || "Loading…"}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {aiInsight || ""}
        </p>
      </div>
    </div>
  );
}
