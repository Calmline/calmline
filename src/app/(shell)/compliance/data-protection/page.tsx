"use client";

import { Card } from "@/components/ui/Card";

export default function ComplianceDataProtectionPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Data Protection</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Encryption</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            All data encrypted at rest and in transit
          </p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Isolation</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Each organization operates in a secure partition
          </p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Access Control</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Strict permission-based access
          </p>
        </Card>
      </div>
    </div>
  );
}
