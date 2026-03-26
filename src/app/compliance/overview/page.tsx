"use client";

import { Card } from "@/components/ui/Card";

export default function ComplianceOverviewPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Compliance</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#9FB3C8]">
        Monitor system activity, policy usage, and data protection across your organization.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Audit activity</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">Track system and agent events</p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Policy enforcement</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Ensure responses follow uploaded policies
          </p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Data protection</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Encryption, isolation, and access control
          </p>
        </Card>
      </div>
    </div>
  );
}
