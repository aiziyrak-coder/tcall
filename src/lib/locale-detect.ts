"use client";

import { LANGUAGES } from "./languages-list";

const SUPPORTED = new Set<string>(LANGUAGES.map((l) => l.code));

/** Detects the best supported UI language from the device/browser settings. */
export function detectDeviceLanguage(fallback = "en"): string {
  if (typeof navigator === "undefined") return fallback;
  const candidates =
    navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || fallback];
  for (const c of candidates) {
    if (!c) continue;
    const code = c.split("-")[0].toLowerCase();
    if (SUPPORTED.has(code)) return code;
  }
  return fallback;
}
