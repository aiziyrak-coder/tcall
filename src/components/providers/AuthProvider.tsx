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
import { cacheUser, readCachedUser, cacheToken, clearAuthCache, readCachedToken } from "@/lib/auth-cache";
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
    if (!next) cacheToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const gen = ++refreshGenRef.current;
    const cached = readCachedUser();
    const cachedToken = readCachedToken();

    try {
      const r = await apiFetch("/api/auth/session");
      if (gen !== refreshGenRef.current) return cached;

      if (!r.ok) {
        if (cached && cachedToken) return cached;
        if (r.status === 401 || r.status === 403) {
          clearAuthCache();
          setUserState(null);
          return null;
        }
        throw new Error("Session yuklanmadi");
      }

      const d = await r.json();
      if (gen !== refreshGenRef.current) return cached;

      if (d.user) {
        setUserState(d.user);
        cacheUser(d.user);
        if (d.token) cacheToken(d.token);
        setError(null);
        return d.user;
      }

      if (cached && cachedToken) return cached;

      setUserState(null);
      cacheUser(null);
      return null;
    } catch (e) {
      if (gen !== refreshGenRef.current) return cached;
      if (cached && cachedToken) return cached;
      setError(e instanceof Error ? e.message : "Xatolik");
      return cached;
    }
  }, []);

  useEffect(() => {
    const cached = readCachedUser();
    const token = readCachedToken();
    if (cached && token) setUserState(cached);
    void refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const logout = useCallback(async () => {
    refreshGenRef.current += 1;
    await apiFetch("/api/auth/session", { method: "DELETE" });
    clearAuthCache();
    setUserState(null);
    window.location.href = isNativeApp() ? "/login" : "/";
  }, []);

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
