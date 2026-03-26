"use client";

import { Card } from "@/components/ui/Card";

export default function OrganizationOverviewPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#E6EEF6]">Organization</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#9FB3C8]">
        Administrative overview for policy controls, team setup, and data governance.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Policy Engine</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Configure policy rules that guide all AI responses.
          </p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Agents & Users</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Manage support team members and role access.
          </p>
        </Card>
        <Card className="!rounded-xl !border-white/[0.08] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-white/90">Data & Privacy</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            Review privacy controls and organization-level safeguards.
          </p>
        </Card>
      </div>
    </div>
  );
}
