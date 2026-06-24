import { isNativeApp } from "@/lib/native-app";
import type { User } from "@/components/providers/AuthProvider";

export const USER_CACHE_KEY = "tcall:user";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return isNativeApp() ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

export function readCachedUser(): User | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
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
