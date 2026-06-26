"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";
import { cacheUser, readCachedUser } from "@/lib/auth-cache";
import { isNativeApp } from "@/lib/native-app";

export interface User {
  userId: string;
  email: string;
  name: string;
  language: string;
  tcallId: string;
  translationMode: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshSession: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshGenRef = useRef(0);

  const setUser = useCallback((next: User | null) => {
    refreshGenRef.current += 1;
    setUserState(next);
    cacheUser(next);
  }, []);

  const refreshSession = useCallback(async () => {
    const gen = ++refreshGenRef.current;
    try {
      const r = await apiFetch("/api/auth/session");
      if (gen !== refreshGenRef.current) return null;
      if (!r.ok) throw new Error("Session yuklanmadi");
      const d = await r.json();
      if (gen !== refreshGenRef.current) return null;
      setUserState(d.user ?? null);
      cacheUser(d.user ?? null);
      setError(null);
      return d.user ?? null;
    } catch (e) {
      if (gen !== refreshGenRef.current) return null;
      const cached = readCachedUser();
      if (!cached) {
        setUserState(null);
        cacheUser(null);
      }
      setError(e instanceof Error ? e.message : "Xatolik");
      return cached;
    }
  }, []);

  useEffect(() => {
    const cached = readCachedUser();
    if (cached) setUserState(cached);
    void refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    window.location.href = isNativeApp() ? "/login" : "/";
  }, [setUser]);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, logout, setUser, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
