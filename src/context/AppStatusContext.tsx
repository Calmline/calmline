"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ConnectionStatus = "connecting" | "connected" | "disconnected";
type SessionStatus = "idle" | "listening" | "in_call";

type AppStatus = {
  connection: ConnectionStatus;
  session: SessionStatus;
  setConnection: (s: ConnectionStatus) => void;
  setSession: (s: SessionStatus) => void;
};

const AppStatusContext = createContext<AppStatus | null>(null);

export function AppStatusProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionStatus>("disconnected");
  const [session, setSession] = useState<SessionStatus>("idle");
  return (
    <AppStatusContext.Provider
      value={{
        connection,
        session,
        setConnection,
        setSession,
      }}
    >
      {children}
    </AppStatusContext.Provider>
  );
}

export function useAppStatus() {
  const ctx = useContext(AppStatusContext);
  return ctx ?? { connection: "disconnected" as const, session: "idle" as const, setConnection: () => {}, setSession: () => {} };
}
