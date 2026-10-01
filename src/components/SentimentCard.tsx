"use client";

type SentimentCardProps = {
  headline?: string;
  callerTonePct?: number;
  agentCalmPct?: number;
  resolutionPct?: number;
};

function BarRow({
  label,
  pct,
  barClass,
}: {
  label: string;
  pct: number;
  barClass: string;
}) {
  const width = Math.min(100, Math.max(8, pct));
  return (
    <div className="flex items-center gap-3">
      <span className="w-[108px] shrink-0 text-[13px] text-[#120D06]/45">{label}</span>
      <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-[3px] border border-[rgba(150,118,80,0.16)] bg-[#EEE4DE]">
        <div className={`h-full rounded-[3px] ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function SentimentCard({
  headline = "—",
  callerTonePct = 62,
  agentCalmPct = 88,
  resolutionPct = 45,
}: SentimentCardProps) {
  return (
    <section className="shrink-0 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-4 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A5E1A]">LIVE SENTIMENT</p>
      <p className="mt-2 font-serif text-lg text-[#120D06]">{headline}</p>

      <div className="mt-4 space-y-3">
        <BarRow label="Caller tone" pct={callerTonePct} barClass="bg-gradient-to-r from-[#A87828] to-[#4E7A5E]" />
        <BarRow label="Agent calm" pct={agentCalmPct} barClass="bg-gradient-to-r from-[#9A5E1A] to-[#4E7A5E]" />
        <BarRow label="Resolution path" pct={resolutionPct} barClass="bg-gradient-to-r from-[#A87E28] to-[#4E7A5E]" />
      </div>
    </section>
  );
}
