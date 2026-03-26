"use client";

export default function HistoryPage() {
  return (
    <div className="block w-full pb-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Call History</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9FB3C8]">
          All calls stored privately • Searchable • Transcripts available
        </p>
      </header>

      <section className="mt-8">
        <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#0F1C2B]/95 to-[#0B1623]/98 p-6 shadow-[0_8px_28px_rgba(0,0,0,0.22)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white/85">March 2026</h2>
          </div>

          {/* Future-ready injection point: call_sessions.map(...) */}
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-8 py-14 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04]"
              aria-hidden
            >
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300/70" />
            </div>
            <p className="mt-4 text-base font-medium text-white/85">No calls yet</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/50">
              Your completed calls will appear here once activity begins
            </p>
            <p className="mt-4 text-xs leading-relaxed text-white/40">
              Calls are automatically recorded and stored after each session
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
