"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { isNativeApp } from "@/lib/native-app";

function TelegramEffects() {
  useTelegramWebApp();
  return null;
}

export function TelegramInit() {
  const [ready, setReady] = useState(false);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (isNativeApp()) {
      setSkip(true);
      return;
    }
    if (window.Telegram?.WebApp) setReady(true);
  }, []);

  if (skip) return null;

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      {ready && <TelegramEffects />}
    </>
  );
}
