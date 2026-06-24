"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    cacheUser(next);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const r = await apiFetch("/api/auth/session");
      if (!r.ok) throw new Error("Session yuklanmadi");
      const d = await r.json();
      setUser(d.user ?? null);
      setError(null);
      return d.user ?? null;
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : "Xatolik");
      return null;
    }
  }, [setUser]);

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
