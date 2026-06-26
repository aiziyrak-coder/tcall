"use client";

import { useEffect } from "react";
import { isLandingHost } from "@/lib/domains";
import { enableWebAppChrome, isStandaloneDisplay } from "@/lib/app-fullscreen";
import { isNativeApp } from "@/lib/native-app";
import { registerServiceWorker, ensureWebPushSubscription } from "@/lib/web-push-client";

/** Web: ilova kabi fixed viewport va chrome */
export function WebAppInit() {
  useEffect(() => {
    if (typeof window !== "undefined" && isLandingHost(window.location.hostname)) return;
    if (isNativeApp()) return;
    enableWebAppChrome();

    if (isStandaloneDisplay()) {
      document.body.classList.add("web-app-standalone");
    }

    // Web push: register the service worker and subscribe if already permitted + logged in.
    void registerServiceWorker();
    void ensureWebPushSubscription();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
        // Retry subscription sync (cheap & idempotent) — covers the just-logged-in case.
        void ensureWebPushSubscription();
      }
    };
    onVis();
    window.addEventListener("resize", onVis);
    window.addEventListener("orientationchange", onVis);
    return () => {
      window.removeEventListener("resize", onVis);
      window.removeEventListener("orientationchange", onVis);
    };
  }, []);

  return null;
}
