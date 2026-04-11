"use client";

import {
  LayoutDashboard,
  Phone,
  Shield,
  CheckCircle,
  Clock,
  BookOpen,
  HeartPulse,
  Star,
  FileText,
  Users,
  Lock,
  ClipboardCheck,
  ScrollText,
  Database,
} from "lucide-react";
import { SidebarNavItem } from "@/components/sidebar/SidebarNavItem";

function SectionDivider() {
  return <div className="my-2 border-t border-[#5c2a35]/50" aria-hidden />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c9a9ae]">
      {children}
    </div>
  );
}

function LiveSection() {
  return (
    <>
      <SectionTitle>LIVE</SectionTitle>
      <nav className="flex flex-col space-y-1.5" aria-label="Live">
        <SidebarNavItem label="Live Protection" href="/live-session" icon={Phone} />
        <SidebarNavItem
          label="Pre-Call Armor"
          href="/pre-call-armor"
          icon={Shield}
        />
        <SidebarNavItem
          label="Boundary Shield"
          href="/boundary-shield"
          icon={CheckCircle}
        />
        <SidebarNavItem
          label="Emotional Continuity"
          href="/workload-signal"
          icon={HeartPulse}
        />
        <SidebarNavItem
          label="Privacy Architecture"
          href="/organization/privacy"
          icon={Lock}
        />
      </nav>
    </>
  );
}

function HistorySection() {
  return (
    <>
      <SectionDivider />
      <SectionTitle>HISTORY</SectionTitle>
      <nav className="flex flex-col space-y-1" aria-label="History">
        <SidebarNavItem label="Call History" href="/history" icon={Clock} />
        <SidebarNavItem
          label="Training Mode"
          href="/training-mode"
          icon={BookOpen}
        />
      </nav>
    </>
  );
}

function WellnessSection() {
  return (
    <>
      <SectionDivider />
      <SectionTitle>WELLNESS</SectionTitle>
      <nav className="flex flex-col space-y-1" aria-label="Wellness">
        <SidebarNavItem
          label="Emotional Load"
          href="/workload-signal"
          icon={HeartPulse}
        />
        <SidebarNavItem label="Win Journal" href="/win-journal" icon={Star} />
      </nav>
    </>
  );
}

function OrganizationSection() {
  return (
    <>
      <SectionDivider />
      <SectionTitle>ORGANIZATION</SectionTitle>
      <nav className="flex flex-col space-y-1" aria-label="Organization">
        <SidebarNavItem
          label="Overview"
          href="/organization/overview"
          icon={LayoutDashboard}
        />
        <SidebarNavItem
          label="Policy Upload"
          href="/policy-upload"
          icon={FileText}
        />
        <SidebarNavItem
          label="Agents & Users"
          href="/organization/agents"
          icon={Users}
        />
        <SidebarNavItem
          label="Data & Privacy"
          href="/organization/privacy"
          icon={Lock}
        />
      </nav>
    </>
  );
}

function ComplianceSection() {
  return (
    <>
      <SectionDivider />
      <SectionTitle>COMPLIANCE</SectionTitle>
      <nav className="flex flex-col space-y-1" aria-label="Compliance">
        <SidebarNavItem
          label="Compliance Status"
          href="/compliance/overview"
          icon={ClipboardCheck}
        />
        <SidebarNavItem
          label="Audit Log"
          href="/compliance/audit-log"
          icon={ScrollText}
        />
        <SidebarNavItem
          label="Data Protection"
          href="/compliance/data-protection"
          icon={Database}
        />
      </nav>
    </>
  );
}

export default function Sidebar({ view }: { view: "agent" | "admin" }) {
  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-[244px] border-r border-[#5c2a35]/60 bg-[#2a1419]"
      aria-label="Dashboard navigation"
    >
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-3 py-5">
        <div className="px-2 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c9a9ae]">
            CalmLine
          </p>
          <h2 className="mt-1 text-sm font-semibold text-[#f5e8ea]">Agent Workspace</h2>
        </div>
        {view === "agent" && (
          <div className="flex flex-col">
            <LiveSection />
            <HistorySection />
            <WellnessSection />
          </div>
        )}

        {view === "admin" && (
          <div className="flex flex-col">
            <LiveSection />
            <HistorySection />
            <WellnessSection />
            <OrganizationSection />
            <ComplianceSection />
          </div>
        )}
      </div>
    </aside>
  );
}
