"use client";

const UNLOCK_KEY = "tcall_unlocked";
const ENABLED_CACHE_KEY = "tcall_pin_enabled";

export function isUnlockedThisSession(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearUnlocked(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* ignore */
  }
}

/** Cached hint so we can show the lock instantly on cold start (no content flash). */
export function getCachedPinEnabled(): boolean | null {
  try {
    const v = localStorage.getItem(ENABLED_CACHE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function setCachedPinEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ENABLED_CACHE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
