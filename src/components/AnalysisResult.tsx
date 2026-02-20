"use client";

import type { AnalysisData } from "@/lib/analyze";

type Props = { data: AnalysisData };

function riskColor(risk: string) {
  switch (risk) {
    case "Low":
      return "text-risk-low";
    case "Medium":
      return "text-risk-medium";
    case "High":
      return "text-risk-high";
    default:
      return "text-muted";
  }
}

export function AnalysisResult({ data }: Props) {
  const riskLevel =
    data.escalation_risk >= 70 ? "high" : data.escalation_risk >= 40 ? "medium" : "low";

  return (
    <div className="rounded-2xl border border-accent bg-white p-8 shadow-card-elevated sm:p-10">
      <h3 className="mb-8 text-xl font-bold tracking-tight text-heading">
        Analysis
      </h3>

      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-subtitle">
            Escalation risk
          </p>
          <div className="mt-3 flex items-baseline gap-4">
            <span className="text-3xl font-bold text-heading sm:text-4xl">
              {data.escalation_risk}%
            </span>
            <div
              className="h-2 flex-1 max-w-[200px] overflow-hidden rounded-full bg-accent"
              role="progressbar"
              aria-valuenow={data.escalation_risk}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full ${
                  riskLevel === "high"
                    ? "bg-risk-high"
                    : riskLevel === "medium"
                      ? "bg-risk-medium"
                      : "bg-risk-low"
                }`}
                style={{ width: `${data.escalation_risk}%` }}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-subtitle">
            Complaint risk
          </p>
          <p className={`mt-2 font-semibold ${riskColor(data.complaint_risk)}`}>
            {data.complaint_risk}
          </p>
        </div>

        {data.deescalation_response && (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-subtitle">
              Suggested response
            </p>
            <p className="mt-2 rounded-xl bg-accent/50 px-4 py-3.5 text-base text-heading italic">
              {data.deescalation_response}
            </p>
          </div>
        )}

        {data.tone_guidance && (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-subtitle">
              Tone guidance
            </p>
            <p className="mt-2 text-base text-heading">{data.tone_guidance}</p>
          </div>
        )}
      </div>
    </div>
  );
}
