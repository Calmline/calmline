"use client";

export default function HistoryPage() {
  return (
    <div className="block w-full pb-12">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Call History</h1>
        <p className="mt-2 text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
          All calls stored privately • Searchable • Transcripts available
        </p>
      </header>

      <section className="mt-8">
        <div className="rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] p-6 shadow-[0_2px_10px_rgba(100,70,30,0.06)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-[#120D06]">March 2026</h2>
          </div>

          {/* Future-ready injection point: call_sessions.map(...) */}
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-8 py-14 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(150,118,80,0.22)] bg-[#F7F2EA]"
              aria-hidden
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[rgba(150,118,80,0.35)]" />
            </div>
            <p className="mt-4 text-base font-medium text-[#120D06]">No calls yet</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
              Your completed calls will appear here once activity begins
            </p>
            <p className="mt-4 text-xs leading-relaxed text-[rgba(18,13,6,0.4)]">
              Calls are automatically recorded and stored after each session
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
