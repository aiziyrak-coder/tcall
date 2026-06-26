"use client";

import type { User } from "@/components/providers/AuthProvider";

export interface AndroidBridge {
  getStoredToken?: () => string;
  getStoredUser?: () => string;
  saveSession?: (token: string, userJson: string) => void;
  clearSession?: () => void;
  syncCookies?: () => void;
  registerPush?: (token: string) => void;
  requestNotifications?: () => void;
  openExternal?: (url: string) => void;
  getAppVersion?: () => string;
}

export function androidBridge(): AndroidBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { TcallAndroidBridge?: AndroidBridge }).TcallAndroidBridge ?? null;
}

export function isAndroidBridge(): boolean {
  return Boolean(
    (typeof window !== "undefined" &&
      (window as unknown as { TcallNative?: { isAndroid?: boolean } }).TcallNative?.isAndroid) ||
      androidBridge(),
  );
}

/** Native EncryptedSharedPreferences bilan sinxronlash */
export function syncNativeSession(token: string | null, user: User | null) {
  const bridge = androidBridge();
  if (!bridge) return;
  try {
    if (token && user && bridge.saveSession) {
      bridge.saveSession(token, JSON.stringify(user));
    } else if (bridge.clearSession) {
      bridge.clearSession();
    }
    bridge.syncCookies?.();
  } catch {
    /* ignore */
  }
}

export function clearNativeSession() {
  try {
    androidBridge()?.clearSession?.();
    androidBridge()?.syncCookies?.();
  } catch {
    /* ignore */
  }
}
