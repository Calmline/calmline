"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { useAppStatus } from "@/context/AppStatusContext";

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
    <header className="sticky top-0 z-30 border-b border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] backdrop-blur-sm">
      <div className="flex min-h-[3.75rem] items-center justify-between gap-4 px-8 py-4">
        <Link href="/overview" className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-[#120D06]">
            CalmLine
          </span>
          <span
            className="rounded-full border border-[rgba(150,118,80,0.2)] px-3 py-1 text-xs font-medium text-[rgba(18,13,6,0.45)]"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            Agent Protection Platform
          </span>
        </Link>

        <div className="mx-6 hidden max-w-sm flex-1 lg:block">
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(18,13,6,0.45)]" />
            <input
              type="text"
              placeholder="Search sessions, agents…"
              className="h-10 w-full rounded-lg border border-[rgba(150,118,80,0.2)] bg-[#F7F2EA] pl-8 pr-4 text-sm text-[#120D06] placeholder-[rgba(18,13,6,0.45)] transition-all duration-200 focus:border-[#9A5E1A]/40 focus:outline-none focus:ring-1 focus:ring-[#9A5E1A]/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {connection === "connecting" && pathname !== "/live-session" && (
            <span
              className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-950/40 px-3 py-1 text-xs font-medium text-rose-300 before:mr-1.5 before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:bg-rose-400 before:content-['']"
            >
              Connecting…
            </span>
          )}
          <div className="relative" ref={avatarRef}>
            <button
              type="button"
              onClick={() => setAvatarOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4E7A5E] text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#9A5E1A]/50 focus:ring-offset-2 focus:ring-offset-[#FEFCF8]"
            >
              K
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-lg border border-[rgba(150,118,80,0.16)] bg-[#FEFCF8] py-1 shadow-[0_2px_10px_rgba(100,70,30,0.08)] ring-1 ring-black/20">
                <div className="border-b border-[rgba(150,118,80,0.12)] px-3 py-2">
                  <p className="text-sm font-medium text-[#120D06]">Kyla Davis</p>
                  <p className="text-xs text-[rgba(18,13,6,0.45)]">kyla@company.com</p>
                </div>
                <Link
                  href="#"
                  className="block px-3 py-2 text-sm text-[#120D06] transition-colors hover:bg-[#EEE4DE]"
                  onClick={() => setAvatarOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href="#"
                  className="block px-3 py-2 text-sm text-[#120D06] transition-colors hover:bg-[#EEE4DE]"
                  onClick={() => setAvatarOpen(false)}
                >
                  Workspace
                </Link>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-[#120D06] transition-colors hover:bg-[#EEE4DE]"
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
