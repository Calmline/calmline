"use client";

import { AppStatusProvider } from "@/context/AppStatusContext";
import { RoleProvider } from "@/context/RoleContext";
import {
  DashboardViewProvider,
  useDashboardView,
} from "@/context/DashboardViewContext";
import Sidebar from "@/components/Sidebar";

function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { view } = useDashboardView();

  return (
    <>
      <Sidebar view={view} />
      <main className="relative z-10 ml-[244px] min-h-screen bg-[#0B141F] px-6 py-6 font-sans antialiased text-[#E6EEF6]">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="flex min-h-0 flex-col gap-4">{children}</div>
        </div>
      </main>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppStatusProvider>
      <RoleProvider>
        <DashboardViewProvider>
          <AppShellLayout>{children}</AppShellLayout>
        </DashboardViewProvider>
      </RoleProvider>
    </AppStatusProvider>
  );
}
