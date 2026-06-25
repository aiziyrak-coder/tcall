"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AppSplash } from "@/components/AppSplash";
import { AppLock } from "@/components/AppLock";
import { useAuth } from "@/components/providers/AuthProvider";
import { isUnlockedThisSession, getCachedPinEnabled, setCachedPinEnabled } from "@/lib/app-lock";

type GateState = "loading" | "locked" | "unlocked";

export function AppLockGate({ userName, children }: { userName?: string; children: React.ReactNode }) {
  const { logout } = useAuth();
  const [state, setState] = useState<GateState>(() => {
    if (typeof window === "undefined") return "loading";
    if (isUnlockedThisSession()) return "unlocked";
    const cached = getCachedPinEnabled();
    if (cached === true) return "locked";
    if (cached === false) return "unlocked";
    return "loading";
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/security/pin");
        if (!r.ok) {
          if (!cancelled) setState((s) => (s === "loading" ? "unlocked" : s));
          return;
        }
        const d = await r.json();
        if (cancelled) return;
        setCachedPinEnabled(!!d.enabled);
        if (!d.enabled) {
          setState("unlocked");
        } else if (isUnlockedThisSession()) {
          setState("unlocked");
        } else {
          setState("locked");
        }
      } catch {
        if (!cancelled) setState((s) => (s === "loading" ? "unlocked" : s));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <AppSplash />;
  if (state === "locked") {
    return <AppLock userName={userName} onUnlock={() => setState("unlocked")} onLogout={() => void logout()} />;
  }
  return <>{children}</>;
}
