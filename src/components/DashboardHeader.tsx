"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { useAppStatus } from "@/context/AppStatusContext";

const navItems = [
  { href: "/overview", label: "Dashboard" },
  { href: "/live-session", label: "Live Session" },
  { href: "/settings", label: "Settings" },
] as const;

export function DashboardHeader() {
  const pathname = usePathname();
  const { connection } = useAppStatus();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center justify-between gap-3 px-6">
        <Link href="/overview" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            Calmline
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Realtime Coaching
          </span>
        </Link>

        <div className="hidden flex-1 max-w-sm mx-6 lg:block">
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search sessions, agents…"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-4 text-sm text-slate-700 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {connection === "connecting" && (
            <span
              className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 before:mr-1.5 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-rose-500 before:content-['']"
            >
              Connecting…
            </span>
          )}
          <nav className="hidden gap-1 sm:flex" aria-label="Top navigation">
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={label}
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/40 ${
                    isActive
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/40 focus:ring-offset-2"
            >
              K
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-md ring-1 ring-slate-900/5">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-sm font-medium text-slate-800">Kyla Davis</p>
                  <p className="text-xs text-slate-500">kyla@company.com</p>
                </div>
                <Link
                  href="#"
                  className="block px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setAvatarOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href="#"
                  className="block px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setAvatarOpen(false)}
                >
                  Workspace
                </Link>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setAvatarOpen(false)}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
