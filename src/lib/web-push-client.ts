"use client";

import { apiFetch } from "@/lib/api";
import { isNativeApp } from "@/lib/native-app";

let swReg: ServiceWorkerRegistration | null = null;
let lastSyncedEndpoint: string | null = null;
let vapidKeyCache: string | null | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function supported(): boolean {
  return (
    !isNativeApp() &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null;
  if (!swReg) {
    swReg = await navigator.serviceWorker.register("/sw.js").catch(() => null);
  }
  return swReg;
}

async function getVapidKey(): Promise<string | null> {
  if (vapidKeyCache !== undefined) return vapidKeyCache ?? null;
  try {
    const r = await apiFetch("/api/push/vapid");
    const d = await r.json();
    vapidKeyCache = d.publicKey || null;
  } catch {
    vapidKeyCache = null;
  }
  return vapidKeyCache ?? null;
}

/**
 * Ensures the current browser is subscribed to web push and the subscription is
 * stored on the server. Only subscribes if notifications are permitted.
 * Pass { requestPermission: true } to prompt the user (use after a click).
 */
export async function ensureWebPushSubscription(opts?: { requestPermission?: boolean }): Promise<boolean> {
  if (!supported()) return false;
  const reg = await registerServiceWorker();
  if (!reg) return false;

  let perm = Notification.permission;
  if (perm === "default" && opts?.requestPermission) {
    try {
      perm = await Notification.requestPermission();
    } catch {
      return false;
    }
  }
  if (perm !== "granted") return false;

  const key = await getVapidKey();
  if (!key) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
    } catch {
      return false;
    }
  }

  if (lastSyncedEndpoint === sub.endpoint) return true;

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  try {
    const r = await apiFetch("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }),
    });
    if (r.ok) {
      lastSyncedEndpoint = sub.endpoint;
      return true;
    }
  } catch {
    /* ignore (e.g. offline or not logged in) */
  }
  return false;
}
