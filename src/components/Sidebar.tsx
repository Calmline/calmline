"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconOverview,
  IconShield,
  IconLive,
  IconPolicies,
  IconAnalytics,
  IconHistory,
  IconAgents,
  IconSettings,
  IconTraining,
} from "@/components/Icons";

const items = [
  { href: "/overview", label: "Overview", Icon: IconOverview },
  { href: "/pre-call-armor", label: "Pre-Call Armor", Icon: IconShield },
  { href: "/live-session", label: "Live Session", Icon: IconLive },
  { href: "/policies", label: "Policies", Icon: IconPolicies },
  { href: "/risk-analytics", label: "Risk Analytics", Icon: IconAnalytics },
  { href: "/training-mode", label: "Training Mode", Icon: IconTraining },
  { href: "/history", label: "History", Icon: IconHistory },
  { href: "/agents", label: "Agents", Icon: IconAgents },
  { href: "/settings", label: "Settings", Icon: IconSettings },
] as const;

function NavItem({
  label,
  href,
  Icon,
}: {
  label: string;
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`sidebar-item ${isActive ? "active" : ""}`}
    >
      <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-slate-900 opacity-100" : "text-slate-600 opacity-80 hover:opacity-100"}`} />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 z-40 h-full w-64 border-r border-slate-200 bg-white"
      aria-label="Dashboard navigation"
    >
      <div className="flex h-full flex-col p-4">
        <div className="mb-4 px-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
            NAVIGATION
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {items.map(({ href, label, Icon }) => (
            <NavItem key={href} label={label} href={href} Icon={Icon} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
