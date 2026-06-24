"use client";

import { apiFetch } from "@/lib/api";

const INCOMING_CHANNEL = "incoming_calls";

type CapCore = typeof import("@capacitor/core");
type CapApp = typeof import("@capacitor/app");
type CapStatusBar = typeof import("@capacitor/status-bar");
type CapSplash = typeof import("@capacitor/splash-screen");
type CapLocal = typeof import("@capacitor/local-notifications");
type CapPush = typeof import("@capacitor/push-notifications");

let capCore: CapCore | null = null;

async function core(): Promise<CapCore> {
  if (!capCore) capCore = await import("@capacitor/core");
  return capCore;
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core") as CapCore;
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getNativePlatform(): "android" | "ios" | "web" {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core") as CapCore;
    return Capacitor.getPlatform() as "android" | "ios" | "web";
  } catch {
    return "web";
  }
}

let initDone = false;

/** Native ilova ishga tushganda — status bar, splash, bildirishnomalar */
export async function initNativeApp(onDeepLink?: (path: string) => void) {
  if (!isNativeApp() || initDone) return;
  initDone = true;

  const { Capacitor } = await core();
  document.body.classList.add("native-app", `native-${Capacitor.getPlatform()}`);

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar") as CapStatusBar;
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#f2f2f7" });
    }
  } catch {
    /* ignore */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen") as CapSplash;
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }

  if (Capacitor.getPlatform() === "android") {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications") as CapLocal;
      await LocalNotifications.createChannel({
        id: INCOMING_CHANNEL,
        name: "Kiruvchi qo'ng'iroqlar",
        description: "Tcall qo'ng'iroq bildirishnomalari",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
        lights: true,
        lightColor: "#007AFF",
      });
    } catch {
      /* ignore */
    }
  }

  try {
    const { App } = await import("@capacitor/app") as CapApp;
    App.addListener("appUrlOpen", (event) => {
      const path = urlToPath(event.url);
      if (path && onDeepLink) onDeepLink(path);
    });
  } catch {
    /* ignore */
  }

  void setupPushNotifications();
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

async function setupPushNotifications() {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications") as CapPush;
    const { Capacitor } = await core();
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      void apiFetch("/api/user/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.value,
          platform: Capacitor.getPlatform() === "ios" ? "ios" : "android",
        }),
      });
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification.data as Record<string, string> | undefined;
      if (data?.type === "incoming_call" && data.roomId) {
        window.location.href = `/call/${data.roomId.toUpperCase()}`;
      }
    });
  } catch {
    /* FCM sozlanmagan bo'lishi mumkin */
  }
}

export async function requestNativeNotificationPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications") as CapLocal;
    const { PushNotifications } = await import("@capacitor/push-notifications") as CapPush;
    const { Capacitor } = await core();
    const local = await LocalNotifications.requestPermissions();
    if (Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios") {
      const push = await PushNotifications.requestPermissions();
      return local.display === "granted" || push.receive === "granted";
    }
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
    const { LocalNotifications } = await import("@capacitor/local-notifications") as CapLocal;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.abs(hashCode(roomId)) % 2147483647 || 1001,
          title: "Tcall — Kiruvchi qo'ng'iroq",
          body: `${callerName} · ${tcallId}`,
          channelId: INCOMING_CHANNEL,
          sound: "default",
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
    const { LocalNotifications } = await import("@capacitor/local-notifications") as CapLocal;
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
