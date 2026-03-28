"use client";

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
        <div className="min-h-screen">{children}</div>
      </RoleProvider>
    </AppStatusProvider>
  );
}
