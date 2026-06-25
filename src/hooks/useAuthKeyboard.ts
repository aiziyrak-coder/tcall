"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native-app";

/** Klaviatura ochilganda input ko'rinishini ta'minlash */
export function scrollInputIntoView(el: HTMLElement) {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 320);
  });
}

/** Auth sahifalarida Android klaviatura bilan layout moslashuvi */
export function useAuthKeyboard() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let cancelled = false;

    void import("@capacitor/keyboard").then(({ Keyboard, KeyboardResize }) => {
      if (!cancelled) void Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    });

    return () => {
      cancelled = true;
      void import("@capacitor/keyboard").then(({ Keyboard, KeyboardResize }) => {
        void Keyboard.setResizeMode({ mode: KeyboardResize.None });
      });
    };
  }, []);
}
