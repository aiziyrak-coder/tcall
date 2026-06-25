"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getUI, type UILocale } from "@/lib/languages";
import { isRTL } from "@/lib/languages-list";
import type { UIText } from "@/lib/ui-locale-service";
import { apiFetch } from "@/lib/api";

const LOCALE_STORAGE_KEY = "tcall:ui-locale";

interface LocaleContextValue {
  ui: UIText;
  lang: string;
  loading: boolean;
  refresh: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function loadStoredLocale(lang: string): UIText | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LOCALE_STORAGE_KEY}:${lang}`);
    if (!raw) return null;
    return JSON.parse(raw) as UIText;
  } catch {
    return null;
  }
}

function storeLocale(lang: string, ui: UIText) {
  try {
    localStorage.setItem(`${LOCALE_STORAGE_KEY}:${lang}`, JSON.stringify(ui));
  } catch {
    /* ignore quota */
  }
}

const STATIC_LOCALES = new Set<string>(["uz", "ru", "en"]);

function isStaticLocale(code: string): code is UILocale {
  return STATIC_LOCALES.has(code);
}

export function LocaleProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const code = lang.split("-")[0].toLowerCase();
  const staticUi = useMemo(() => {
    if (isStaticLocale(code)) return getUI(code) as UIText;
    return null;
  }, [code]);

  const [ui, setUI] = useState<UIText>(() => staticUi || loadStoredLocale(code) || (getUI("en") as UIText));
  const [loading, setLoading] = useState(!staticUi && !loadStoredLocale(code));

  const fetchLocale = (signal?: AbortSignal) => {
    if (isStaticLocale(code)) {
      setUI(getUI(code) as UIText);
      setLoading(false);
      return;
    }

    const stored = loadStoredLocale(code);
    if (stored) {
      setUI(stored);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void apiFetch(`/api/ui/locale?lang=${encodeURIComponent(code)}`, { signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.ui) {
          setUI(d.ui as UIText);
          storeLocale(code, d.ui as UIText);
        }
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchLocale(controller.signal);
    if (typeof document !== "undefined") {
      document.documentElement.lang = code;
      document.documentElement.dir = isRTL(code) ? "rtl" : "ltr";
    }
    return () => controller.abort();
  }, [code]);

  const value = useMemo(
    () => ({ ui, lang: code, loading, refresh: fetchLocale }),
    [ui, code, loading]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

/** Platform UI matnlari — LocaleProvider ichida ishlatiladi */
export function useUI(fallbackLang?: string): UIText {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx.ui;
  const code = (fallbackLang || "en").split("-")[0].toLowerCase();
  return getUI(isStaticLocale(code) ? code : "en") as UIText;
}

export function useUILoading(): boolean {
  const ctx = useContext(LocaleContext);
  return ctx?.loading ?? false;
}
