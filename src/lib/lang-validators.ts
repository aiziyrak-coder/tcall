import { isIso639Code } from "./iso639-codes";

export function isKnownLanguage(code: string): boolean {
  const base = code.split("-")[0].toLowerCase();
  if (!/^[a-z]{2,3}$/.test(base)) return false;
  return isIso639Code(base);
}

export function normalizeLanguageCode(code: string): string {
  return code.split("-")[0].toLowerCase();
}
