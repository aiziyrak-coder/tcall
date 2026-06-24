"use client";

import { createContext, useContext } from "react";
import type { useCall } from "@/hooks/useCall";

export type ActiveCallState = ReturnType<typeof useCall>;

const ActiveCallStateContext = createContext<ActiveCallState | null>(null);

export function ActiveCallStateProvider({
  value,
  children,
}: {
  value: ActiveCallState;
  children: React.ReactNode;
}) {
  return (
    <ActiveCallStateContext.Provider value={value}>
      {children}
    </ActiveCallStateContext.Provider>
  );
}

export function useActiveCall() {
  const ctx = useContext(ActiveCallStateContext);
  if (!ctx) throw new Error("No active call session");
  return ctx;
}

export function useActiveCallOptional() {
  return useContext(ActiveCallStateContext);
}
