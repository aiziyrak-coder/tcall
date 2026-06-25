"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useUI } from "@/components/providers/LocaleProvider";
import { isNativeApp } from "@/lib/native-app";

interface NetworkStatusBannerProps {
  userLanguage: string;
}

export function NetworkStatusBanner({ userLanguage }: NetworkStatusBannerProps) {
  const ui = useUI(userLanguage);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    let removeNative: (() => void) | undefined;
    if (isNativeApp()) {
      void import("@capacitor/network").then(({ Network }) => {
        void Network.getStatus().then((s) => setOffline(!s.connected));
        const h = Network.addListener("networkStatusChange", (s) => setOffline(!s.connected));
        removeNative = () => void h.then((l) => l.remove());
      });
    }

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      removeNative?.();
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="network-offline-banner" role="status" aria-live="polite">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{ui.offline}</span>
    </div>
  );
}
