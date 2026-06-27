"use client";

import { restoreFromNativeBridge, TOKEN_CACHE_KEY, USER_CACHE_KEY } from "@/lib/auth-cache";
import { androidBridge } from "@/lib/android-bridge";

/** Android WebView: bridge mavjud bo'lsa TcallNative + localStorage restore */
export function bootstrapAndroidAuth(): boolean {
  if (typeof window === "undefined") return false;
  const bridge = androidBridge();
  if (!bridge) return false;

  try {
    const w = window as unknown as {
      TcallNative?: { isAndroid?: boolean; platform?: string };
      Capacitor?: {
        isNativePlatform?: () => boolean;
        getPlatform?: () => string;
        isPluginAvailable?: (name: string) => boolean;
      };
    };

    w.TcallNative = { isAndroid: true, platform: "android" };
    w.Capacitor = w.Capacitor || {
      isNativePlatform: () => true,
      getPlatform: () => "android",
      isPluginAvailable: () => false,
    };

    restoreFromNativeBridge();

    document.documentElement.classList.add("web-app", "native-app", "native-android");
    document.body?.classList.add("web-app", "native-app", "native-android");
  } catch {
    /* ignore */
  }

  try {
    return Boolean(localStorage.getItem(TOKEN_CACHE_KEY) && localStorage.getItem(USER_CACHE_KEY));
  } catch {
    return false;
  }
}
