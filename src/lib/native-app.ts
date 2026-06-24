"use client";

import { apiFetch } from "@/lib/api";

const INCOMING_CHANNEL = "incoming_calls";

/** Capacitor native WebView inject qilgan bridge */
interface CapBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  isPluginAvailable?: (name: string) => boolean;
}

declare global {
  interface Window {
    Capacitor?: CapBridge;
  }
}

function bridge(): CapBridge | null {
  if (typeof window === "undefined") return null;
  return window.Capacitor ?? null;
}

export function isNativeApp(): boolean {
  try {
    return bridge()?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function getNativePlatform(): "android" | "ios" | "web" {
  try {
    const p = bridge()?.getPlatform?.();
    if (p === "android" || p === "ios") return p;
  } catch {
    /* ignore */
  }
  return "web";
}

let initDone = false;

async function waitForCapacitor(maxMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (isNativeApp()) return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return isNativeApp();
}

/** Native ilova ishga tushganda */
export async function initNativeApp(onDeepLink?: (path: string) => void) {
  if (initDone) return;
  const ready = await waitForCapacitor();
  if (!ready) return;
  initDone = true;

  const platform = getNativePlatform();
  if (!document.body.classList.contains("native-app")) {
    document.body.classList.add("native-app", `native-${platform}`);
  }

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    if (platform === "android") {
      await StatusBar.setBackgroundColor({ color: "#f2f2f7" });
    }
  } catch {
    /* ignore */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }

  if (platform === "android") {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.createChannel({
        id: INCOMING_CHANNEL,
        name: "Kiruvchi qo'ng'iroqlar",
        description: "Tcall qo'ng'iroq bildirishnomalari",
        importance: 5,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#007AFF",
      });
    } catch {
      /* ignore */
    }
  }

  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", (event) => {
      const path = urlToPath(event.url);
      if (path && onDeepLink) onDeepLink(path);
    });
  } catch {
    /* ignore */
  }
}

function urlToPath(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol === "tcall:" && u.hostname === "call") {
      return `/call/${u.pathname.replace(/^\//, "").toUpperCase()}`;
    }
    if (u.hostname === "tcall.vizara.uz") {
      return u.pathname + u.search;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const local = await LocalNotifications.requestPermissions();
    return local.display === "granted";
  } catch {
    return false;
  }
}

export async function showNativeIncomingCallNotification(
  callerName: string,
  tcallId: string,
  roomId: string
) {
  if (!isNativeApp()) return;
  if (document.visibilityState === "visible") return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.abs(hashCode(roomId)) % 2147483647 || 1001,
          title: "Tcall — Kiruvchi qo'ng'iroq",
          body: `${callerName} · ${tcallId}`,
          channelId: INCOMING_CHANNEL,
          ongoing: true,
          autoCancel: false,
          extra: { roomId, type: "incoming_call" },
        },
      ],
    });
  } catch (e) {
    console.warn("Native notification failed:", e);
  }
}

export async function cancelNativeIncomingNotification(roomId?: string) {
  if (!isNativeApp()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    if (roomId) {
      const id = Math.abs(hashCode(roomId)) % 2147483647 || 1001;
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } else {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    }
  } catch {
    /* ignore */
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
