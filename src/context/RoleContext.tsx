"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Role = "agent" | "manager" | "admin";
export type AppRole = Role;

type RoleContextValue = {
  role: Role;
  setRole: (nextRole: Role) => void;
  setRoleAndPersist: (nextRole: Role) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setCurrentRole] = useState<Role>("agent");

  const setRole = useCallback((nextRole: Role) => {
    setCurrentRole(nextRole);
    localStorage.setItem("calmline_role", nextRole);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("calmline_role");
    if (saved === "agent" || saved === "manager" || saved === "admin") {
      setCurrentRole(saved);
    }
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole, setRoleAndPersist: setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return ctx;
}
