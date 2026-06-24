/** Whisper API qo'llab-quvvatlaydigan til kodlari (ISO-639-1) — qolganlari auto-detect */
const WHISPER_LANGS = new Set([
  "ru", "en", "tr", "ar", "zh", "ko", "ja", "de", "fr", "es", "hi", "kk",
  "pt", "it", "pl", "uk", "fa", "ur", "bn", "vi", "th", "id", "ms",
  "nl", "sv", "no", "da", "fi", "cs", "sk", "hu", "ro", "bg", "hr", "sr", "sl",
  "he", "ta", "te", "mr", "gu", "ml", "pa", "ne", "si", "mn", "az", "ka", "hy",
  "sw", "af", "tl", "be", "ca", "eu", "gl", "is", "ga", "cy", "mt", "lb", "sq",
  "mk", "bs", "ps", "am", "yo", "ha", "my", "km", "lo",
]);

/** Whisper to'g'ridan-to'g'ri qo'llab-quvvatlamaydigan tillar uchun yaqin til fallback */
export const WHISPER_FALLBACK_LANG: Record<string, string[]> = {
  uz: ["tr", "ru", "az"],
  ky: ["kk", "ru", "tr"],
  tg: ["fa", "ru", "tr"],
  tk: ["tr", "az"],
  ug: ["tr", "ru"],
  tt: ["ru", "tr"],
  crh: ["tr", "ru"],
};

/** Whisper uchun til kodi — qo'llab-quvvatlanmasa auto-detect */
export function getWhisperLanguage(code: string): string | undefined {
  const base = code.split("-")[0].toLowerCase();
  return WHISPER_LANGS.has(base) ? base : undefined;
}

export interface TranscriptionAttempt {
  hintLang?: string;
  whisperLang?: string;
}

/** Transkripsiya uchun ketma-ket urinishlar — barcha tillar uchun */
export function getTranscriptionAttempts(hintLang?: string): TranscriptionAttempt[] {
  const attempts: TranscriptionAttempt[] = [];
  const seen = new Set<string>();

  const add = (hint?: string, whisper?: string) => {
    const key = `${hint || "_"}:${whisper || "auto"}`;
    if (seen.has(key)) return;
    seen.add(key);
    attempts.push({ hintLang: hint, whisperLang: whisper });
  };

  if (!hintLang) {
    add(undefined, undefined);
    return attempts;
  }

  const base = hintLang.split("-")[0].toLowerCase();
  const nativeWhisper = getWhisperLanguage(base);

  if (nativeWhisper) {
    add(base, nativeWhisper);
  }

  add(base, undefined);

  for (const fb of WHISPER_FALLBACK_LANG[base] || []) {
    if (getWhisperLanguage(fb)) add(base, fb);
  }

  add(undefined, undefined);
  return attempts;
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
    uz: "Assalomu alaykum. Qandaysiz? Men o'zbek tilida gapiryapman. Rahmat. Ha, yo'q. Iltimos, yaxshi, tushundim, qayerda, qachon, nima, kim, qanday.",
    ru: "Разговор лицом к лицу на русском языке.",
    en: "Face-to-face conversation in English.",
    tr: "Yüz yüze Türkçe konuşma.",
    ar: "محادثة وجهاً لوجه باللغة العربية.",
    zh: "面对面中文对话。",
    ko: "대면 한국어 대화.",
    ja: "対面での日本語会話。",
    de: "Persönliches Gespräch auf Deutsch.",
    fr: "Conversation en face à face en français.",
    es: "Conversación cara a cara en español.",
    hi: "हिंदी में सामने की बातचीत।",
    pt: "Conversa presencial em português.",
    it: "Conversazione faccia a faccia in italiano.",
    fa: "مکالمه رو در رو به فارسی.",
    vi: "Cuộc trò chuyện trực tiếp bằng tiếng Việt.",
    id: "Percakapan langsung dalam bahasa Indonesia.",
    kk: "Бет-бетке қазақ тілінде сөйлесу.",
    ky: "Бет алды сүйлөшүү кыргызча.",
    tg: "Суҳбати рӯ ба рӯ ба забони тоҷикӣ.",
  };
  return prompts[language] || "Live face-to-face conversation between two people.";
}
