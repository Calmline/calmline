"use client";

import { Card } from "@/components/ui/Card";

export default function ComplianceDataProtectionPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Data Protection</h1>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Encryption</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            All data encrypted at rest and in transit
          </p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Isolation</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Each organization operates in a secure partition
          </p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Access Control</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Strict permission-based access
          </p>
        </Card>
      </div>
    </div>
  );
}
