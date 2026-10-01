"use client";

import { Card } from "@/components/ui/Card";

export default function ComplianceAuditLogPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Audit Log</h1>

      <Card className="mt-8 !rounded-xl !border-[rgba(150,118,80,0.16)] !p-0 overflow-hidden hover:!translate-y-0">
        <div className="grid grid-cols-5 border-b border-[rgba(150,118,80,0.12)] bg-[#F7F2EA] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[rgba(18,13,6,0.45)]">
          <span>Time</span>
          <span>Event</span>
          <span>User</span>
          <span>Action</span>
          <span>Status</span>
        </div>
        <div className="px-6 py-12 text-center text-sm text-[rgba(18,13,6,0.45)]">No activity yet</div>
      </Card>
    </div>
  );
}
