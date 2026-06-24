"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";

function TelegramEffects() {
  useTelegramWebApp();
  return null;
}

export function TelegramInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) setReady(true);
  }, []);

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
