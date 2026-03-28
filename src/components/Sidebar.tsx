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
  return <div className="my-2 border-t border-white/5" aria-hidden />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 px-3 text-xs tracking-wide text-gray-500">
      {children}
    </div>
  );
}

function LiveSection() {
  return (
    <>
      <SectionTitle>LIVE</SectionTitle>
      <nav className="flex flex-col space-y-1" aria-label="Live">
        <SidebarNavItem
          label="Dashboard"
          href="/overview"
          icon={LayoutDashboard}
        />
        <SidebarNavItem label="Active Call" href="/live-session" icon={Phone} />
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
      className="fixed left-0 top-0 z-40 h-screen w-[220px] border-r border-white/[0.08] bg-[#0B141F]"
      aria-label="Dashboard navigation"
    >
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-2 py-4">
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
