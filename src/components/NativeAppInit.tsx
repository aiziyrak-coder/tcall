"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp, initNativeApp, requestNativeNotificationPermission } from "@/lib/native-app";

/** Native Capacitor ilova ishga tushirish */
export function NativeAppInit() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    void initNativeApp((path) => {
      router.push(path);
    });

    void requestNativeNotificationPermission();

    let removeTap: (() => void) | undefined;

    void import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
      const sub = LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
        const roomId = action.notification.extra?.roomId as string | undefined;
        if (roomId) router.push(`/call/${String(roomId).toUpperCase()}`);
      });
      removeTap = () => {
        void sub.then((h) => h.remove());
      };
    });

    return () => removeTap?.();
  }, [router]);

  return null;
}
