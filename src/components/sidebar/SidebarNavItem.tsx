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
          ? "border-[#e8d5c4]/25 bg-[#f5ebe3]/15 text-[#fdf8f4] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "border-transparent text-[#c9a9ae] hover:border-[#5c2a35]/80 hover:bg-[#3d1c24]/80 hover:text-[#f5e8ea]"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          isActive
            ? "text-[#e8c4b0]"
            : "text-[#9e6b73] group-hover:text-[#e8d5c4]"
        }`}
        aria-hidden
      />
      <span>{label}</span>
    </Link>
  );
}
