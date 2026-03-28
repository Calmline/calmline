"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardView = "agent" | "admin";

type DashboardViewContextValue = {
  view: DashboardView;
  setView: (next: DashboardView) => void;
};

const DashboardViewContext = createContext<DashboardViewContextValue | null>(
  null,
);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<DashboardView>("agent");
  const value = useMemo(() => ({ view, setView }), [view]);
  return (
    <DashboardViewContext.Provider value={value}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export function useDashboardView() {
  const ctx = useContext(DashboardViewContext);
  if (!ctx) {
    throw new Error(
      "useDashboardView must be used within DashboardViewProvider",
    );
  }
  return ctx;
}
