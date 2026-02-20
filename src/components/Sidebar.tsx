"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview" },
  { href: "/live-session", label: "Live Session" },
  { href: "/risk-analytics", label: "Risk Analytics" },
  { href: "/history", label: "History" },
  { href: "/agents", label: "Agents" },
  { href: "/settings", label: "Settings" },
] as const;

function NavItem({ label, href }: { label: string; href: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`sidebar-item ${isActive ? "active" : ""}`}
    >
      {label}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 z-40 h-full w-[240px] border-r border-accent bg-sidebar-bg"
      aria-label="Dashboard navigation"
    >
      <nav className="flex flex-col gap-0.5 p-4">
        {items.map(({ href, label }) => (
          <NavItem key={href} label={label} href={href} />
        ))}
      </nav>
    </aside>
  );
}
