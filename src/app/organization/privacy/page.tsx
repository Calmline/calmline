"use client";

import { Card } from "@/components/ui/Card";

export default function OrganizationPrivacyPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Data & Privacy</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#9FB3C8]">
        Privacy controls and data-handling standards for your organization.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Storage boundaries</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Data remains isolated to your organization workspace.
          </p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Access controls</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Permission-based access protects operational data.
          </p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Encryption</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Data is protected in transit and at rest.
          </p>
        </Card>
      </div>
    </div>
  );
}
