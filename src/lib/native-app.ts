"use client";

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { apiFetch } from "@/lib/api";

const INCOMING_CHANNEL = "incoming_calls";

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function getNativePlatform(): "android" | "ios" | "web" {
  return Capacitor.getPlatform() as "android" | "ios" | "web";
}

let initDone = false;

/** Native ilova ishga tushganda — status bar, splash, bildirishnomalar */
export async function initNativeApp(onDeepLink?: (path: string) => void) {
  if (!isNativeApp() || initDone) return;
  initDone = true;

  document.body.classList.add("native-app", `native-${Capacitor.getPlatform()}`);

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#f2f2f7" });
    }
  } catch {
    /* ignore */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }

  if (Capacitor.getPlatform() === "android") {
    try {
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

  App.addListener("appUrlOpen", (event) => {
    const path = urlToPath(event.url);
    if (path && onDeepLink) onDeepLink(path);
  });

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
          actionTypeId: "INCOMING_CALL",
          attachments: undefined,
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
