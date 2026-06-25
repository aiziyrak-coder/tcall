"use client";

import { apiFetch } from "@/lib/api";

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

/**
 * Native (Android/iOS) push bildirishnomalarni ro'yxatga olish.
 * Token /api/user/device-token ga yuboriladi. Bildirishnoma bosilganda qo'ng'iroqqa o'tadi.
 * Ishlashi uchun: @capacitor/push-notifications + Firebase (google-services.json / APNs) + qayta build kerak.
 */
export async function registerNativePush(
  onOpenCall: (roomId: string) => void
): Promise<() => void> {
  try {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!cap?.isNativePlatform?.()) return () => {};
    const platform = cap.getPlatform?.();
    if (platform !== "android" && platform !== "ios") return () => {};

    const mod = await import("@capacitor/push-notifications").catch(() => null);
    if (!mod) return () => {};
    const { PushNotifications } = mod;

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") return () => {};

    // Android uchun yuqori muhimlikdagi "calls" kanali (heads-up + ovoz)
    if (platform === "android") {
      try {
        await PushNotifications.createChannel({
          id: "calls",
          name: "Qo'ng'iroqlar",
          description: "Kiruvchi qo'ng'iroqlar",
          importance: 5,
          sound: "default",
          visibility: 1,
          vibration: true,
          lights: true,
        });
      } catch {
        /* ignore */
      }
    }

    await PushNotifications.register();

    const subs: Array<{ remove: () => Promise<void> }> = [];

    subs.push(
      await PushNotifications.addListener("registration", async (token) => {
        try {
          await apiFetch("/api/user/device-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value, platform }),
          });
        } catch {
          /* ignore */
        }
      })
    );

    subs.push(
      await PushNotifications.addListener("registrationError", (err) => {
        console.warn("Push registration error:", err);
      })
    );

    subs.push(
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const data = action.notification?.data as { roomId?: string; type?: string } | undefined;
        if (data?.roomId) onOpenCall(String(data.roomId).toUpperCase());
      })
    );

    return () => {
      subs.forEach((s) => void s.remove());
    };
  } catch (e) {
    console.warn("registerNativePush failed:", e);
    return () => {};
  }
}
