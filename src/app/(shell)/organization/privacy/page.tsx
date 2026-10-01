"use client";

import { Card } from "@/components/ui/Card";

export default function OrganizationPrivacyPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Data & Privacy</h1>
      <p className="mt-2 max-w-2xl text-sm text-[rgba(18,13,6,0.45)]">
        Privacy controls and data-handling standards for your organization.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Storage boundaries</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Data remains isolated to your organization workspace.
          </p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Access controls</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Permission-based access protects operational data.
          </p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Encryption</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Data is protected in transit and at rest.
          </p>
        </Card>
      </div>
    </div>
  );
}
