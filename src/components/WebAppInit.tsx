"use client";

import { useEffect } from "react";
import { enableWebAppChrome, isStandaloneDisplay } from "@/lib/app-fullscreen";
import { isNativeApp } from "@/lib/native-app";

/** Web: ilova kabi fixed viewport va chrome */
export function WebAppInit() {
  useEffect(() => {
    if (isNativeApp()) return;
    enableWebAppChrome();

    if (isStandaloneDisplay()) {
      document.body.classList.add("web-app-standalone");
    }

    const onVis = () => {
      if (document.visibilityState === "visible") {
        document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
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
