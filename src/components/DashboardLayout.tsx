"use client";

import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AppStatusProvider } from "@/context/AppStatusContext";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppStatusProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="ml-64 flex flex-1 flex-col min-h-screen" style={{ background: "#F7F9FB" }}>
          <DashboardHeader />
          <main className="flex-1">
            <div className="mx-auto max-w-5xl px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AppStatusProvider>
  );
}
