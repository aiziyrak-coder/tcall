import {
  requestNativeNotificationPermission,
  showNativeIncomingCallNotification,
  cancelNativeIncomingNotification,
  isNativeApp,
} from "./native-app";

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    return requestNativeNotificationPermission();
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showIncomingCallNotification(
  callerName: string,
  tcallId: string,
  roomId?: string
) {
  if (isNativeApp() && roomId) {
    void showNativeIncomingCallNotification(callerName, tcallId, roomId);
    return;
  }
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    const n = new Notification("Tcall — Kiruvchi qo'ng'iroq", {
      body: `${callerName} · ${tcallId}`,
      icon: "/icon.svg",
      tag: "tcall-incoming",
      requireInteraction: true,
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function closeNotifications(roomId?: string) {
  if (isNativeApp()) {
    void cancelNativeIncomingNotification(roomId);
  }
}
