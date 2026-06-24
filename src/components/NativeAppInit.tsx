"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp, initNativeApp, requestNativeNotificationPermission } from "@/lib/native-app";

/** Native Capacitor ilova ishga tushirish — xatolik ilovani yopmasin */
export function NativeAppInit() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let removeTap: (() => void) | undefined;

    async function boot() {
      try {
        if (!isNativeApp()) return;

        await initNativeApp((path) => {
          if (!cancelled) router.push(path);
        });

        if (cancelled) return;
        await requestNativeNotificationPermission();

        const { LocalNotifications } = await import("@capacitor/local-notifications");
        const sub = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (action) => {
            const roomId = action.notification.extra?.roomId as string | undefined;
            if (roomId && !cancelled) {
              router.push(`/call/${String(roomId).toUpperCase()}`);
            }
          }
        );
        removeTap = () => {
          void sub.remove();
        };
      } catch (e) {
        console.warn("NativeAppInit failed:", e);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      removeTap?.();
    };
  }, [router]);

  return null;
}
