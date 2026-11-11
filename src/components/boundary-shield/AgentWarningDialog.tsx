"use client";

import { useEffect, useRef } from "react";
import type { AgentAction, BoundaryShieldAlert } from "@/lib/boundary-shield/types";

const ACTION_LABELS: Record<AgentAction, string> = {
  acknowledge: "Acknowledge",
  continue: "Continue",
  request_supervisor_review: "Request supervisor review",
};

type AgentWarningDialogProps = {
  alert: BoundaryShieldAlert | null;
  onAction: (action: AgentAction, alert: BoundaryShieldAlert) => void;
};

export function AgentWarningDialog({ alert, onAction }: AgentWarningDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!alert) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [alert]);

  if (!alert) return null;

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#2C1A12]/72 p-3 sm:items-center">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="agent-warning-title"
        aria-describedby="agent-warning-description agent-warning-script"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-[rgba(150,118,80,0.26)] bg-[#FEFCF8] p-6 shadow-[0_24px_60px_rgba(44,26,18,0.35)] outline-none"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A5E1A]">Boundary Shield</p>
        <h2 id="agent-warning-title" className="mt-1 font-serif text-2xl text-[#2C1A12]">
          {alert.title}
        </h2>
        <p id="agent-warning-description" className="mt-3 text-sm leading-relaxed text-[#120D06]/70">
          Language aimed at the agent was detected. Read the suggested script, then choose one option.
          The call is not ended automatically.
        </p>
        <div className="mt-4 rounded-xl border border-[rgba(150,118,80,0.16)] bg-[#F7F2EA] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#120D06]/45">Customer language</p>
          <p className="mt-2 text-[15px] italic leading-relaxed text-[#2C1A12]">“{alert.triggeringText}”</p>
        </div>
        <div className="mt-3 rounded-xl border border-[rgba(154,94,26,0.28)] bg-[rgba(154,94,26,0.08)] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A5E1A]">Suggested script</p>
          <p id="agent-warning-script" className="mt-2 text-[15px] leading-relaxed text-[#2C1A12]">
            {alert.script}
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {alert.actions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => onAction(action, alert)}
              className={
                action === "request_supervisor_review"
                  ? "rounded-full bg-[#9A5E1A] px-5 py-2.5 text-sm font-semibold text-white"
                  : "rounded-full border border-[rgba(150,118,80,0.26)] bg-[#FEFCF8] px-5 py-2.5 text-sm font-semibold text-[#2C1A12] hover:bg-[#F7F2EA]"
              }
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
