/** Whisper API qo'llab-quvvatlaydigan til kodlari (ISO-639-1) */
const WHISPER_LANGS = new Set([
  "uz", "ru", "en", "tr", "ar", "zh", "ko", "ja", "de", "fr", "es", "hi", "kk",
]);

/** Whisper uchun til kodi — qo'llab-quvvatlanmasa auto-detect */
export function getWhisperLanguage(code: string): string | undefined {
  const base = code.split("-")[0].toLowerCase();
  return WHISPER_LANGS.has(base) ? base : undefined;
}

const WHISPER_HALLUCINATIONS = [
  "thank you for watching",
  "thanks for watching",
  "subtitles by",
  "subscribe",
  "please subscribe",
  "amara.org",
  "mbc",
  "copyright",
  "silence",
  "music",
];

/** Bo'sh yoki shovqin transkriptlarni filtrlash */
export function isValidTranscript(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (/^[\s.,!?…\-–—'"«»]+$/u.test(t)) return false;

  const lower = t.toLowerCase();
  if (WHISPER_HALLUCINATIONS.some((h) => lower.includes(h))) return false;

  return true;
}

/** Takroriy transkriptlarni aniqlash */
export function isDuplicateTranscript(prev: string, next: string): boolean {
  if (!prev || !next) return false;
  const a = normalizeForDedup(prev);
  const b = normalizeForDedup(next);
  if (a === b) return true;
  if (a.length > 8 && b.length > 8 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getWhisperPrompt(language: string): string {
  const prompts: Record<string, string> = {
    uz: "Telefon qo'ng'irog'i, o'zbek tilida suhbat.",
    ru: "Телефонный звонок, разговор на русском языке.",
    en: "Phone call conversation in English.",
    tr: "Telefon görüşmesi, Türkçe konuşma.",
    ar: "مكالمة هاتفية، محادثة باللغة العربية.",
  };
  return prompts[language] || "Live phone call conversation.";
}
