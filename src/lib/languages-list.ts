import { LANGUAGES, type LanguageEntry } from "./language-registry";

export { LANGUAGES, type LanguageEntry };
export type LanguageCode = string;

/** Right-to-left languages */
export const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  "ar", "he", "fa", "ur", "ps", "dv", "yi", "ku", "sd", "ug",
]);

export function isRTL(code: string | null | undefined): boolean {
  if (!code) return false;
  return RTL_LANGUAGES.has(code.split("-")[0].toLowerCase());
}

const SPEECH_LOCALE_MAP: Record<string, string> = {
  uz: "uz-UZ", ru: "ru-RU", en: "en-US", tr: "tr-TR", ar: "ar-SA",
  zh: "zh-CN", ko: "ko-KR", ja: "ja-JP", de: "de-DE", fr: "fr-FR",
  es: "es-ES", hi: "hi-IN", tg: "tg-TJ", kk: "kk-KZ", ky: "ky-KG",
  pt: "pt-PT", it: "it-IT", pl: "pl-PL", uk: "uk-UA", fa: "fa-IR",
  ur: "ur-PK", bn: "bn-BD", pa: "pa-IN", ta: "ta-IN", te: "te-IN",
  mr: "mr-IN", gu: "gu-IN", ml: "ml-IN", id: "id-ID", ms: "ms-MY",
  vi: "vi-VN", th: "th-TH", my: "my-MM", km: "km-KH", lo: "lo-LA",
  ne: "ne-NP", si: "si-LK", mn: "mn-MN", az: "az-AZ", ka: "ka-GE",
  hy: "hy-AM", he: "he-IL", nl: "nl-NL", sv: "sv-SE", no: "nb-NO",
  nb: "nb-NO", nn: "nn-NO", da: "da-DK", fi: "fi-FI", cs: "cs-CZ",
  sk: "sk-SK", hu: "hu-HU", ro: "ro-RO", bg: "bg-BG", hr: "hr-HR",
  sr: "sr-RS", sl: "sl-SI", lt: "lt-LT", lv: "lv-LV", et: "et-EE",
  sq: "sq-AL", mk: "mk-MK", bs: "bs-BA", ps: "ps-AF", sw: "sw-KE",
  am: "am-ET", yo: "yo-NG", ha: "ha-NG", af: "af-ZA", tl: "fil-PH",
  fil: "fil-PH", be: "be-BY", ca: "ca-ES", eu: "eu-ES", gl: "gl-ES",
  is: "is-IS", ga: "ga-IE", cy: "cy-GB", mt: "mt-MT", lb: "lb-LU",
  el: "el-GR", kn: "kn-IN", jv: "jv-ID",
};

export const SPEECH_LOCALES: Record<string, string> = SPEECH_LOCALE_MAP;

export function getSpeechLocale(code: string): string {
  const base = code.split("-")[0].toLowerCase();
  return SPEECH_LOCALE_MAP[base] ?? `${base}-${base.toUpperCase()}`;
}
