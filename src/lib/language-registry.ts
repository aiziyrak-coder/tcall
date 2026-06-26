import { ISO639_1_CODES } from "./iso639-codes";

export type LanguageEntry = { code: string; name: string; flag: string };

/** Asosiy tillar — bayroq va mahalliy nom bilan */
export const PRIORITY_LANGUAGES: readonly LanguageEntry[] = [
  { code: "uz", name: "O'zbek", flag: "🇺🇿" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "tg", name: "Тоҷикӣ", flag: "🇹🇯" },
  { code: "kk", name: "Қазақ", flag: "🇰🇿" },
  { code: "ky", name: "Кыргыз", flag: "🇰🇬" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "fa", name: "فارسی", flag: "🇮🇷" },
  { code: "ur", name: "اردو", flag: "🇵🇰" },
  { code: "bn", name: "বাংলা", flag: "🇧🇩" },
  { code: "pa", name: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ta", name: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "తెలుగు", flag: "🇮🇳" },
  { code: "mr", name: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "ગુજરાતી", flag: "🇮🇳" },
  { code: "ml", name: "മലയാളം", flag: "🇮🇳" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "my", name: "မြန်မာ", flag: "🇲🇲" },
  { code: "km", name: "ខ្មែរ", flag: "🇰🇭" },
  { code: "lo", name: "ລາວ", flag: "🇱🇦" },
  { code: "ne", name: "नेपाली", flag: "🇳🇵" },
  { code: "si", name: "සිංහල", flag: "🇱🇰" },
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
  { code: "az", name: "Azərbaycan", flag: "🇦🇿" },
  { code: "ka", name: "ქართული", flag: "🇬🇪" },
  { code: "hy", name: "Հայերեն", flag: "🇦🇲" },
  { code: "he", name: "עברית", flag: "🇮🇱" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "cs", name: "Čeština", flag: "🇨🇿" },
  { code: "sk", name: "Slovenčina", flag: "🇸🇰" },
  { code: "hu", name: "Magyar", flag: "🇭🇺" },
  { code: "ro", name: "Română", flag: "🇷🇴" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "hr", name: "Hrvatski", flag: "🇭🇷" },
  { code: "sr", name: "Српски", flag: "🇷🇸" },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮" },
  { code: "lt", name: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", name: "Latviešu", flag: "🇱🇻" },
  { code: "et", name: "Eesti", flag: "🇪🇪" },
  { code: "sq", name: "Shqip", flag: "🇦🇱" },
  { code: "mk", name: "Македонски", flag: "🇲🇰" },
  { code: "bs", name: "Bosanski", flag: "🇧🇦" },
  { code: "ps", name: "پښتو", flag: "🇦🇫" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "am", name: "አማርኛ", flag: "🇪🇹" },
  { code: "yo", name: "Yorùbá", flag: "🇳🇬" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "af", name: "Afrikaans", flag: "🇿🇦" },
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
  { code: "be", name: "Беларуская", flag: "🇧🇾" },
  { code: "ca", name: "Català", flag: "🇪🇸" },
  { code: "eu", name: "Euskara", flag: "🇪🇸" },
  { code: "gl", name: "Galego", flag: "🇪🇸" },
  { code: "is", name: "Íslenska", flag: "🇮🇸" },
  { code: "ga", name: "Gaeilge", flag: "🇮🇪" },
  { code: "cy", name: "Cymraeg", flag: "🇬🇧" },
  { code: "mt", name: "Malti", flag: "🇲🇹" },
  { code: "lb", name: "Lëtzebuergesch", flag: "🇱🇺" },
];

const REGION_BY_CODE: Record<string, string> = {
  uz: "UZ", ru: "RU", en: "GB", tr: "TR", ar: "SA", zh: "CN", ko: "KR", ja: "JP",
  de: "DE", fr: "FR", es: "ES", hi: "IN", tg: "TJ", kk: "KZ", ky: "KG", pt: "PT",
  it: "IT", pl: "PL", uk: "UA", fa: "IR", ur: "PK", bn: "BD", vi: "VN", th: "TH",
  id: "ID", ms: "MY", my: "MM", km: "KH", lo: "LA", ne: "NP", si: "LK", mn: "MN",
  az: "AZ", ka: "GE", hy: "AM", he: "IL", nl: "NL", sv: "SE", no: "NO", da: "DK",
  fi: "FI", cs: "CZ", sk: "SK", hu: "HU", ro: "RO", bg: "BG", hr: "HR", sr: "RS",
  sl: "SI", lt: "LT", lv: "LV", et: "EE", sq: "AL", mk: "MK", bs: "BA", ps: "AF",
  sw: "KE", am: "ET", yo: "NG", ha: "NG", af: "ZA", tl: "PH", be: "BY", is: "IS",
  ga: "IE", cy: "GB", mt: "MT", lb: "LU", el: "GR", nb: "NO", nn: "NO",
};

function flagEmoji(region: string): string {
  if (region.length !== 2) return "🌐";
  const pts = [...region.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...pts);
}

export function flagForCode(code: string): string {
  const region = REGION_BY_CODE[code];
  return region ? flagEmoji(region) : "🌐";
}

export function languageDisplayName(code: string, inLocale = "en"): string {
  try {
    const dn = new Intl.DisplayNames([inLocale], { type: "language" });
    const name = dn.of(code);
    if (name && name !== code) return name;
  } catch {
    /* ignore */
  }
  return code.toUpperCase();
}

function buildLanguages(): LanguageEntry[] {
  const seen = new Set<string>();
  const out: LanguageEntry[] = [];

  for (const p of PRIORITY_LANGUAGES) {
    seen.add(p.code);
    out.push({ ...p });
  }

  const rest: LanguageEntry[] = [];
  for (const code of ISO639_1_CODES) {
    if (seen.has(code)) continue;
    seen.add(code);
    rest.push({
      code,
      name: languageDisplayName(code),
      flag: flagForCode(code),
    });
  }
  rest.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return [...out, ...rest];
}

export const LANGUAGES: LanguageEntry[] = buildLanguages();

export const GLOBAL_LANGUAGES_TAGLINE = "Dunyodagi barcha tillar";
export const GLOBAL_LANGUAGES_TAGLINE_EN = "All languages worldwide";
export const GLOBAL_LANGUAGES_TAGLINE_RU = "Все языки мира";
