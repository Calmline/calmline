"use client";

export type Level = "Low" | "Moderate" | "High" | "Critical";

const styles: Record<Level, { bg: string; text: string }> = {
  Low: { bg: "bg-badge-low", text: "text-risk-low" },
  Moderate: { bg: "bg-badge-medium", text: "text-risk-medium" },
  High: { bg: "bg-badge-high", text: "text-risk-high" },
  Critical: { bg: "bg-red-200", text: "text-red-900" },
};

type Props = {
  level: Level;
  label?: string;
};

export function RiskBadge({ level, label = level }: Props) {
  const s = styles[level];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${s.bg} ${s.text}`}
      role="status"
    >
      {label}
    </span>
  );
}
