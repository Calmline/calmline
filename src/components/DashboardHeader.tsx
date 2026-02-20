"use client";

import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
] as const;

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
      <div className="flex items-center justify-between px-8 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-wide text-neutral-900"
        >
          Calmline
        </Link>
        <nav className="flex items-center gap-8" aria-label="Top navigation">
          {navItems.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
