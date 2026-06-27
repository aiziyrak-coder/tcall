"use client";

import { useEffect, useState } from "react";
import { preferMobileAppLayout } from "@/lib/pwa-install";

/** Mobil / native / PWA — pastki tab bar (sidebar emas) */
export function useMobileBottomNav(): boolean {
  const [bottomNav, setBottomNav] = useState(false);

  useEffect(() => {
    if (preferMobileAppLayout()) {
      setBottomNav(true);
      return;
    }

    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setBottomNav(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return bottomNav;
}
