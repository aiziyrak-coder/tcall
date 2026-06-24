"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  initNativeApp,
  isNativeApp,
  requestNativeNotificationPermission,
} from "@/lib/native-app";

/** Native Capacitor ilova ishga tushirish */
export function NativeAppInit() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    void initNativeApp((path) => {
      router.push(path);
    });

    void requestNativeNotificationPermission();

    const tapSub = LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const roomId = action.notification.extra?.roomId as string | undefined;
      if (roomId) router.push(`/call/${String(roomId).toUpperCase()}`);
    });

    return () => {
      void tapSub.then((h) => h.remove());
    };
  }, [router]);

  return null;
}
