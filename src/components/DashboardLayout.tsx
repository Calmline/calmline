"use client";

import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <div className="ml-[240px] flex flex-1 flex-col min-h-screen">
        <DashboardHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
