"use client";

import { Card } from "@/components/ui/Card";

export default function ComplianceAuditLogPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Audit Log</h1>

      <Card className="mt-8 !rounded-xl !border-white/[0.08] !p-0 overflow-hidden hover:!translate-y-0">
        <div className="grid grid-cols-5 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-white/45">
          <span>Time</span>
          <span>Event</span>
          <span>User</span>
          <span>Action</span>
          <span>Status</span>
        </div>
        <div className="px-6 py-12 text-center text-sm text-white/50">No activity yet</div>
      </Card>
    </div>
  );
}
