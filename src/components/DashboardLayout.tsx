"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AppStatusProvider } from "@/context/AppStatusContext";
import { RoleProvider } from "@/context/RoleContext";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppStatusProvider>
      <RoleProvider>
        <AppShell>{children}</AppShell>
      </RoleProvider>
    </AppStatusProvider>
  );
}
