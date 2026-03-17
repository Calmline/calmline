"use client";

import { Shield } from "lucide-react";

export default function PreCallArmorPage() {
  return (
    <div className="p-6 md:p-8">
      <h1 className="mb-2 text-2xl font-semibold text-heading">
        Pre-Call Armor
      </h1>
      <p className="mb-8 text-sm text-muted">Coming Soon</p>

      <div className="flex items-center justify-center">
        <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-700">
              <Shield className="h-6 w-6" />
            </div>
          </div>
          <p className="text-center text-sm leading-relaxed text-slate-700">
            This feature will analyze incoming caller escalation history, predict emotional
            risk level, and generate a personalized readiness brief for the agent — including
            a suggested opening sentence — all delivered in the seconds before the agent
            answers the call. Built to protect agents before they say hello.
          </p>
        </div>
      </div>
    </div>
  );
}

