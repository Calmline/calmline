"use client";

import { ShieldAlert } from "lucide-react";

type BoundaryShieldModalProps = {
  open: boolean;
  callerLanguage: string;
  script: string;
  transferring?: boolean;
  onContinueCall: () => void;
  onTransferToSupervisor: () => void;
  onEndCall: () => void;
};

export function BoundaryShieldModal({
  open,
  callerLanguage,
  script,
  transferring = false,
  onContinueCall,
  onTransferToSupervisor,
  onEndCall,
}: BoundaryShieldModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2C1A12]/72 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="boundary-shield-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-[34rem] flex-col overflow-y-auto rounded-2xl border border-[rgba(150,118,80,0.26)] bg-[#FEFCF8] p-6 shadow-[0_24px_60px_rgba(44,26,18,0.35)] sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEE4DE] text-[#9A5E1A]">
            <ShieldAlert className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A5E1A]">
              Live Protection
            </p>
            <h2
              id="boundary-shield-title"
              className="font-serif text-[1.65rem] leading-tight text-[#2C1A12]"
            >
              Boundary Shield Activated
            </h2>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-[#120D06]/55">
          Verbal abuse directed at you was detected. Read the approved script, then choose how to proceed.
        </p>

        <div className="mt-5 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#120D06]/45">
            Triggering caller language
          </p>
          <p className="mt-2 font-serif text-[17px] italic leading-relaxed text-[#2C1A12]">
            {callerLanguage.trim()
              ? `“${callerLanguage.trim()}”`
              : "Caller language was not captured in the live transcript yet."}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-[rgba(154,94,26,0.28)] bg-[rgba(154,94,26,0.08)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A5E1A]">
            Boundary Shield script
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#2C1A12]">{script}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onContinueCall}
            className="rounded-full border border-[rgba(150,118,80,0.26)] bg-[#FEFCF8] px-5 py-2.5 text-sm font-semibold text-[#2C1A12] transition hover:border-[#9A5E1A] hover:bg-[#F7F2EA]"
          >
            Continue Call
          </button>
          <button
            type="button"
            onClick={onTransferToSupervisor}
            disabled={transferring}
            className="rounded-full bg-[#9A5E1A] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_3px_12px_rgba(154,94,26,0.32)] transition hover:bg-[#a06028] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {transferring ? "Transferring…" : "Transfer to Supervisor"}
          </button>
          <button
            type="button"
            onClick={onEndCall}
            className="rounded-full border border-[rgba(168,72,72,0.35)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#A84848] transition hover:bg-[rgba(168,72,72,0.08)]"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}
