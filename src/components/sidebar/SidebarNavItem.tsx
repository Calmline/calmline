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
      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[rgba(34,199,201,0.12)] text-[#22c7c9]"
          : "text-[#9FB3C8] hover:bg-white/[0.06] hover:text-[#e6eef6]"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          isActive
            ? "text-emerald-400"
            : "text-gray-400 group-hover:text-white"
        }`}
        aria-hidden
      />
      <span>{label}</span>
    </Link>
  );
}
