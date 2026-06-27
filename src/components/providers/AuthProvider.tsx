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
import { apiFetch, parseApiJson } from "@/lib/api";
import {
  cacheUser,
  readCachedUser,
  cacheToken,
  clearAuthCache,
  readCachedToken,
  persistAuth,
} from "@/lib/auth-cache";
import { bootstrapAndroidAuth } from "@/lib/android-auth-bootstrap";
import { isNativeApp } from "@/lib/native-app";
import { androidBridge } from "@/lib/android-bridge";

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

function readAuthCache() {
  bootstrapAndroidAuth();
  return {
    user: readCachedUser(),
    token: readCachedToken(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshGenRef = useRef(0);

  const applyCachedUser = useCallback((cached: User | null, token: string | null): User | null => {
    if (cached && token) {
      setUserState(cached);
      return cached;
    }
    return null;
  }, []);

  const setUser = useCallback((next: User | null) => {
    refreshGenRef.current += 1;
    setUserState(next);
    cacheUser(next);
    if (!next) cacheToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const gen = ++refreshGenRef.current;
    bootstrapAndroidAuth();

    const applyCache = (): User | null => {
      const { user: cached, token } = readAuthCache();
      if (gen !== refreshGenRef.current) return cached;
      return applyCachedUser(cached, token);
    };

    let cachedResult = applyCache();

    try {
      const r = await apiFetch("/api/auth/session");
      if (gen !== refreshGenRef.current) return cachedResult;

      if (!r.ok) {
        cachedResult = applyCache();
        if (cachedResult) return cachedResult;
        if (r.status === 401 || r.status === 403) {
          clearAuthCache();
          setUserState(null);
          return null;
        }
        throw new Error("Session yuklanmadi");
      }

      const d = await parseApiJson<{ user?: User; token?: string }>(r);
      if (gen !== refreshGenRef.current) return cachedResult;

      if (d.user) {
        setUserState(d.user);
        cacheUser(d.user);
        if (d.token) cacheToken(d.token);
        setError(null);
        return d.user;
      }

      cachedResult = applyCache();
      if (cachedResult) return cachedResult;

      if (!readCachedToken()) {
        setUserState(null);
        cacheUser(null);
      }
      return cachedResult;
    } catch (e) {
      if (gen !== refreshGenRef.current) return cachedResult;
      cachedResult = applyCache();
      if (cachedResult) return cachedResult;
      setError(e instanceof Error ? e.message : "Xatolik");
      return null;
    }
  }, [applyCachedUser]);

  useEffect(() => {
    const delays = [0, 50, 150, 400];
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tryHydrate = () => {
      const { user: cached, token } = readAuthCache();
      if (cached && token) {
        setUserState(cached);
        return true;
      }
      return false;
    };

    tryHydrate();
    for (const ms of delays) {
      if (ms === 0) continue;
      timers.push(
        setTimeout(() => {
          if (tryHydrate()) void refreshSession();
        }, ms)
      );
    }

    void refreshSession().finally(() => setLoading(false));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [refreshSession]);

  useEffect(() => {
    const bridge = androidBridge();
    if (!user) return;
    const token = readCachedToken();
    if (bridge?.registerPush && token) bridge.registerPush(token);
    bridge?.requestNotifications?.();
  }, [user]);

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

/** Login/register dan keyin — cache + state + native bir vaqtda */
export function commitAuthSession(token: string, user: User, setUser: (u: User) => void) {
  persistAuth(token, user);
  setUser(user);
}
