"use client";

import { Card } from "@/components/ui/Card";

export default function ComplianceOverviewPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Compliance</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[rgba(18,13,6,0.45)]">
        Monitor system activity, policy usage, and data protection across your organization.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Audit activity</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">Track system and agent events</p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Policy enforcement</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Ensure responses follow uploaded policies
          </p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Data protection</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Encryption, isolation, and access control
          </p>
        </Card>
      </div>
    </div>
  );
}
