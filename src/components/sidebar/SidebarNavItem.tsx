"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export function SidebarNavItem({
  label,
  href,
  icon: Icon,
  activeMatchPrefix,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When set, item is active for any path starting with this (e.g. /compliance). */
  activeMatchPrefix?: string;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (activeMatchPrefix != null && pathname.startsWith(activeMatchPrefix)) ||
    (activeMatchPrefix == null && href.length > 1 && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
        isActive
          ? "border-transparent bg-[#3D2314] text-white"
          : "border-transparent text-[#D4C5B5] hover:bg-[#3D2314]/50 hover:text-white"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          isActive ? "text-white/90" : "text-[#D4C5B5] group-hover:text-white"
        }`}
        aria-hidden
      />
      <span>{label}</span>
    </Link>
  );
}
