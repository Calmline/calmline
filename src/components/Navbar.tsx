"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-charcoal/10 bg-nav-bg">
      <nav
        className="mx-auto flex max-w-[900px] items-center justify-between px-6 py-4 sm:px-10"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-heading transition hover:text-charcoal"
        >
          Calmline
        </Link>
        <div className="flex items-center gap-12">
          <Link
            href="/"
            className="text-sm font-semibold text-muted transition hover:text-heading"
          >
            Dashboard
          </Link>
          <Link
            href="/settings"
            className="text-sm font-semibold text-muted transition hover:text-heading"
          >
            Settings
          </Link>
        </div>
      </nav>
    </header>
  );
}
