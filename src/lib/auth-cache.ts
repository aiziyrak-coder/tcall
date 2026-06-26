import type { User } from "@/components/providers/AuthProvider";

export const USER_CACHE_KEY = "tcall:user";
export const TOKEN_CACHE_KEY = "tcall:token";

function isAndroidStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const w = window as unknown as { TcallNative?: { isAndroid?: boolean }; Capacitor?: { isNativePlatform?: () => boolean } };
    return Boolean(w.TcallNative?.isAndroid || w.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (isAndroidStorage()) return localStorage;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** Eski Android build sessionStorage ishlatgan — bir marta localStorage ga ko'chirish */
function migrateNativeCache() {
  if (!isAndroidStorage()) return;
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

export function readCachedUser(): User | null {
  migrateNativeCache();
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function readCachedToken(): string | null {
  migrateNativeCache();
  const s = storage();
  if (!s) return null;
  try {
    return s.getItem(TOKEN_CACHE_KEY);
  } catch {
    return null;
  }
}

export function cacheUser(user: User | null) {
  const s = storage();
  if (!s) return;
  try {
    if (user) s.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else s.removeItem(USER_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function cacheToken(token: string | null) {
  const s = storage();
  if (!s) return;
  try {
    if (token) s.setItem(TOKEN_CACHE_KEY, token);
    else s.removeItem(TOKEN_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAuthCache() {
  cacheUser(null);
  cacheToken(null);
}
