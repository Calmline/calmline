"use client";

import { Card } from "@/components/ui/Card";

export default function OrganizationOverviewPage() {
  return (
    <div className="block w-full pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#120D06]">Organization</h1>
      <p className="mt-2 max-w-2xl text-sm text-[rgba(18,13,6,0.45)]">
        Administrative overview for policy controls, team setup, and data governance.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Policy Engine</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Configure policy rules that guide all AI responses.
          </p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Agents & Users</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Manage support team members and role access.
          </p>
        </Card>
        <Card className="!rounded-xl !border-[rgba(150,118,80,0.16)] !p-6 hover:!translate-y-0">
          <h2 className="text-sm font-semibold text-[#120D06]">Data & Privacy</h2>
          <p className="mt-2 text-xs leading-relaxed text-[rgba(18,13,6,0.5)]">
            Review privacy controls and organization-level safeguards.
          </p>
        </Card>
      </div>
    </div>
  );
}
