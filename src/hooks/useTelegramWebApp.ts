"use client";

import { useEffect, useState } from "react";

interface SafeInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  version?: string;
  isVersionAtLeast?: (version: string) => boolean;
  platform?: string;
  colorScheme?: "light" | "dark";
  safeAreaInset?: SafeInset;
  contentSafeAreaInset?: SafeInset;
  viewportStableHeight?: number;
  isExpanded?: boolean;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

function readInset(v?: SafeInset): SafeInset {
  return {
    top: v?.top ?? 0,
    bottom: v?.bottom ?? 0,
    left: v?.left ?? 0,
    right: v?.right ?? 0,
  };
}

function supportsBackButton(tg: TelegramWebApp): boolean {
  if (!tg.BackButton) return false;
  try {
    if (typeof tg.isVersionAtLeast === "function") return tg.isVersionAtLeast("6.1");
  } catch {
    return false;
  }
  return false;
}

function applyTelegramInsets(tg: TelegramWebApp) {
  const safe = readInset(tg.safeAreaInset);
  const content = readInset(tg.contentSafeAreaInset);
  const root = document.documentElement;

  root.style.setProperty("--tg-safe-top", `${safe.top}px`);
  root.style.setProperty("--tg-safe-bottom", `${safe.bottom}px`);
  root.style.setProperty("--tg-safe-left", `${safe.left}px`);
  root.style.setProperty("--tg-safe-right", `${safe.right}px`);
  root.style.setProperty("--tg-content-safe-top", `${content.top}px`);
  root.style.setProperty("--tg-content-safe-bottom", `${content.bottom}px`);
  root.style.setProperty("--tg-content-safe-left", `${content.left}px`);
  root.style.setProperty("--tg-content-safe-right", `${content.right}px`);
}

function applyTelegramThemeColors(tg: TelegramWebApp) {
  try {
    if (typeof tg.isVersionAtLeast === "function" && tg.isVersionAtLeast("6.1")) {
      tg.setHeaderColor?.("#ffffff");
      tg.setBackgroundColor?.("#f2f2f7");
    }
  } catch {
    /* older Telegram WebApp clients */
  }
}

export function useTelegramWebApp() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    setIsTelegram(true);
    document.body.classList.add("tg-webapp");

    tg.ready();
    tg.expand();
    applyTelegramThemeColors(tg);
    applyTelegramInsets(tg);

    const onChange = () => applyTelegramInsets(tg);
    window.addEventListener("resize", onChange);
    setReady(true);

    return () => {
      window.removeEventListener("resize", onChange);
      document.body.classList.remove("tg-webapp");
    };
  }, []);

  return { isTelegram, ready, webApp: typeof window !== "undefined" ? window.Telegram?.WebApp : undefined };
}

export function bindTelegramBackButton(onBack: () => void, enabled: boolean) {
  const tg = window.Telegram?.WebApp;
  if (!tg || !supportsBackButton(tg) || !tg.BackButton) return () => {};

  const handler = () => onBack();
  if (enabled) {
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(handler);
    } catch {
      return () => {};
    }
  } else {
    try {
      tg.BackButton.hide();
    } catch {
      /* ignore */
    }
  }

  return () => {
    try {
      tg.BackButton?.offClick(handler);
      tg.BackButton?.hide();
    } catch {
      /* ignore */
    }
  };
}
