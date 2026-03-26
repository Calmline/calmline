"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  Brain,
  Clock,
  FileText,
  LayoutDashboard,
  Lock,
  Phone,
  ScrollText,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useRole } from "@/context/RoleContext";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-2 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider first:mt-0"
      style={{ color: "#6B859F" }}
    >
      {children}
    </div>
  );
}

function SidebarLink({
  href,
  label,
  active,
  Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[10px] text-[14px] transition-colors"
      style={{
        padding: "10px 14px",
        color: active ? "#E6EEF6" : "#9FB3C8",
        background: active ? "rgba(31,214,166,0.12)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = active ? "rgba(31,214,166,0.12)" : "transparent";
      }}
    >
      <Icon
        className="h-4 w-4 shrink-0"
        strokeWidth={1.75}
        style={{ color: active ? "#E6EEF6" : "#9FB3C8" }}
        aria-hidden
      />
      <span>{label}</span>
    </Link>
  );
}

function GlobalRoleSwitch() {
  const { role, setRoleAndPersist } = useRole();

  const pill = (r: "agent" | "manager" | "admin", label: string) => {
    const isActive = role === r;
    return (
      <button
        type="button"
        onClick={() => setRoleAndPersist(r)}
        className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        style={{
          background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
          color: isActive ? "#E6EEF6" : "#9FB3C8",
          border: isActive ? "1px solid rgba(255,255,255,0.18)" : "1px solid transparent",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="mb-6">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#6B859F]">
        View as
      </p>
      <div
        className="inline-flex gap-1 rounded-full p-1"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        {pill("agent", "Agent")}
        {pill("manager", "Manager")}
        {pill("admin", "Admin")}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useRole();
  const isAdmin = role === "admin";
  const canSeeBoundaryShield = role === "agent" || role === "manager";
  const isAdminRoute =
    pathname.startsWith("/organization/") ||
    pathname.startsWith("/compliance/") ||
    pathname === "/policies" ||
    pathname === "/policy-upload" ||
    pathname === "/settings";

  const is = (path: string) => pathname === path;

  return (
    <div className="flex min-h-screen">
      <aside
        className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col overflow-y-auto"
        style={{
          background: "#0A1726",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
        aria-label="App navigation"
      >
        <div className="flex flex-col px-3 pb-6 pt-5">
          <SectionLabel>Live</SectionLabel>
          <nav className="flex flex-col gap-0.5">
            <SidebarLink href="/overview" label="Dashboard" active={is("/overview")} Icon={LayoutDashboard} />
            <SidebarLink href="/live-session" label="Active Call" active={is("/live-session")} Icon={Phone} />
            <SidebarLink href="/pre-call-armor" label="Pre-Call Armor" active={is("/pre-call-armor")} Icon={Shield} />
            {canSeeBoundaryShield && (
              <SidebarLink
                href="/boundary-shield"
                label="Boundary Shield"
                active={is("/boundary-shield")}
                Icon={ShieldAlert}
              />
            )}
          </nav>

          <SectionLabel>History</SectionLabel>
          <nav className="flex flex-col gap-0.5">
            <SidebarLink
              href="/history"
              label="Call History"
              active={is("/history") || pathname.startsWith("/history/")}
              Icon={Clock}
            />
            <SidebarLink href="/training-mode" label="Training Mode" active={is("/training-mode")} Icon={Brain} />
          </nav>

          <SectionLabel>Wellness</SectionLabel>
          <nav className="flex flex-col gap-0.5">
            <SidebarLink
              href="/workload-signal"
              label="Workload Signal"
              active={is("/workload-signal")}
              Icon={Activity}
            />
            <SidebarLink
              href="/win-journal"
              label="Win Journal"
              active={is("/win-journal")}
              Icon={BookOpen}
            />
          </nav>

          {isAdmin && (
            <>
              <SectionLabel>Organization</SectionLabel>
              <nav className="flex flex-col gap-0.5">
                <SidebarLink
                  href="/organization/overview"
                  label="Overview"
                  active={is("/organization/overview")}
                  Icon={LayoutDashboard}
                />
                <SidebarLink
                  href="/organization/policy"
                  label="Policy Engine"
                  active={is("/organization/policy") || is("/policies")}
                  Icon={FileText}
                />
                <SidebarLink
                  href="/organization/agents"
                  label="Agents & Users"
                  active={is("/organization/agents") || is("/agents")}
                  Icon={Users}
                />
                <SidebarLink
                  href="/organization/privacy"
                  label="Data & Privacy"
                  active={is("/organization/privacy")}
                  Icon={Shield}
                />
              </nav>

              <SectionLabel>Compliance</SectionLabel>
              <nav className="flex flex-col gap-0.5">
                <SidebarLink
                  href="/compliance/overview"
                  label="Compliance Overview"
                  active={is("/compliance/overview")}
                  Icon={ShieldAlert}
                />
                <SidebarLink
                  href="/compliance/audit-log"
                  label="Audit Log"
                  active={is("/compliance/audit-log")}
                  Icon={ScrollText}
                />
                <SidebarLink
                  href="/compliance/data-protection"
                  label="Data Protection"
                  active={is("/compliance/data-protection")}
                  Icon={Lock}
                />
              </nav>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col bg-[#0B141F]" style={{ marginLeft: 240 }}>
        <DashboardHeader />
        <main className="block min-w-0 w-full flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-6">
            <GlobalRoleSwitch />
            {!isAdmin && isAdminRoute ? (
              <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-[#0F1C2B]/95 to-[#0B1623]/98 p-8 text-center">
                <h2 className="text-base font-semibold text-[#E6EEF6]">Admin view only</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[#9FB3C8]">
                  Switch to Admin using the &quot;View as&quot; toggle to access organization and compliance pages.
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
