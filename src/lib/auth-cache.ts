import type { User } from "@/components/providers/AuthProvider";
import { androidBridge, clearNativeSession, syncNativeSession } from "@/lib/android-bridge";

export const USER_CACHE_KEY = "tcall:user";
export const TOKEN_CACHE_KEY = "tcall:token";

/** Android WebView — bridge mavjud bo'lsa yoki TcallNative/Capacitor */
export function isAndroidClient(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const w = window as unknown as {
      TcallNative?: { isAndroid?: boolean };
      Capacitor?: { isNativePlatform?: () => boolean };
      TcallAndroidBridge?: unknown;
    };
    return Boolean(
      w.TcallAndroidBridge ||
        w.TcallNative?.isAndroid ||
        w.Capacitor?.isNativePlatform?.()
    );
  } catch {
    return false;
  }
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (isAndroidClient()) return localStorage;
    return sessionStorage;
  } catch {
    return null;
  }
}

function migrateNativeCache() {
  if (!isAndroidClient()) return;
  try {
    for (const key of [USER_CACHE_KEY, TOKEN_CACHE_KEY]) {
      if (localStorage.getItem(key)) continue;
      const fromSession = sessionStorage.getItem(key);
      if (fromSession) {
        localStorage.setItem(key, fromSession);
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

/** Native bridge → localStorage (sahifa yuklanishidan oldin) */
export function restoreFromNativeBridge() {
  if (typeof window === "undefined") return;
  try {
    const bridge = androidBridge();
    if (!bridge) return;
    const t = bridge.getStoredToken?.()?.trim();
    const u = bridge.getStoredUser?.()?.trim();
    if (t) localStorage.setItem(TOKEN_CACHE_KEY, t);
    if (u) localStorage.setItem(USER_CACHE_KEY, u);
  } catch {
    /* ignore */
  }
}

function readStorageValue(key: string): string | null {
  migrateNativeCache();
  restoreFromNativeBridge();
  const s = storage();
  if (s) {
    try {
      const v = s.getItem(key);
      if (v) return v;
    } catch {
      /* ignore */
    }
  }
  if (isAndroidClient()) {
    try {
      return localStorage.getItem(key);
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function readCachedUser(): User | null {
  try {
    const raw = readStorageValue(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function readCachedToken(): string | null {
  return readStorageValue(TOKEN_CACHE_KEY);
}

/** Login/register muvaffaqiyatidan keyin — web + native bir vaqtda */
export function persistAuth(token: string, user: User) {
  if (isAndroidClient()) {
    try {
      localStorage.setItem(TOKEN_CACHE_KEY, token);
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }
  const s = storage();
  if (s) {
    try {
      s.setItem(TOKEN_CACHE_KEY, token);
      s.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }
  syncNativeSession(token, user);
}

export function cacheUser(user: User | null) {
  const s = storage();
  if (s) {
    try {
      if (user) s.setItem(USER_CACHE_KEY, JSON.stringify(user));
      else s.removeItem(USER_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
  if (isAndroidClient()) {
    try {
      if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
  syncNativeSession(readCachedToken(), user);
}

export function cacheToken(token: string | null) {
  const s = storage();
  if (s) {
    try {
      if (token) s.setItem(TOKEN_CACHE_KEY, token);
      else s.removeItem(TOKEN_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
  if (isAndroidClient()) {
    try {
      if (token) localStorage.setItem(TOKEN_CACHE_KEY, token);
      else localStorage.removeItem(TOKEN_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
  syncNativeSession(token, readCachedUser());
}

export function clearAuthCache() {
  const s = storage();
  if (s) {
    try {
      s.removeItem(USER_CACHE_KEY);
      s.removeItem(TOKEN_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
  if (isAndroidClient()) {
    try {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(TOKEN_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }
  clearNativeSession();
}
