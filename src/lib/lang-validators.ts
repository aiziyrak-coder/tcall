import { LANGUAGES } from "./languages";

export function isKnownLanguage(code: string): boolean {
  const base = code.split("-")[0].toLowerCase();
  return LANGUAGES.some((l) => l.code === base);
}

export function normalizeLanguageCode(code: string): string {
  return code.split("-")[0].toLowerCase();
}
