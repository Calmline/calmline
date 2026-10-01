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
      <main className="relative z-10 ml-[244px] box-border min-h-screen min-w-0 w-[calc(100vw-244px)] max-w-[calc(100vw-244px)] overflow-x-hidden bg-[#F5EDE8] px-5 pb-5 pt-2 font-sans text-[#120D06] antialiased">
        <div className="min-w-0 w-full">
          <div className="flex min-h-0 min-w-0 flex-col">{children}</div>
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
