/** OpenAI TTS ovoz va tezlik sozlamalari — til bo'yicha */
export type OpenAIVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

const VOICE_BY_LANG: Partial<Record<string, OpenAIVoice>> = {
  uz: "nova",
  ru: "onyx",
  en: "nova",
  tr: "shimmer",
  ar: "fable",
  zh: "shimmer",
  ko: "nova",
  ja: "shimmer",
  de: "onyx",
  fr: "nova",
  es: "nova",
  hi: "fable",
  tg: "nova",
  kk: "onyx",
  ky: "nova",
  pt: "nova",
  it: "shimmer",
  pl: "onyx",
  uk: "nova",
  fa: "fable",
  ur: "fable",
  bn: "fable",
  id: "nova",
  vi: "shimmer",
  th: "shimmer",
  he: "onyx",
  nl: "nova",
  sv: "nova",
  sw: "nova",
};

/** Til oilasi bo'yicha ovoz tanlash */
const VOICE_BY_FAMILY: { test: (code: string) => boolean; voice: OpenAIVoice }[] = [
  { test: (c) => ["ar", "fa", "ur", "ps", "he"].includes(c), voice: "fable" },
  { test: (c) => ["zh", "ja", "ko", "th", "vi", "my", "km", "lo"].includes(c), voice: "shimmer" },
  { test: (c) => ["ru", "uk", "be", "bg", "sr", "mk"].includes(c), voice: "onyx" },
  { test: (c) => ["de", "nl", "sv", "no", "da", "fi", "is"].includes(c), voice: "onyx" },
  { test: (c) => ["hi", "bn", "pa", "ta", "te", "mr", "gu", "ml", "ne", "si"].includes(c), voice: "fable" },
  { test: (c) => ["fr", "es", "pt", "it", "ca", "ro"].includes(c), voice: "nova" },
  { test: (c) => ["uz", "tr", "az", "kk", "ky", "tg"].includes(c), voice: "nova" },
];

export function getTTSVoice(langCode?: string): OpenAIVoice {
  const base = langCode?.split("-")[0].toLowerCase() || "en";
  if (VOICE_BY_LANG[base]) return VOICE_BY_LANG[base]!;
  for (const { test, voice } of VOICE_BY_FAMILY) {
    if (test(base)) return voice;
  }
  const envVoice = process.env.OPENAI_TTS_VOICE as OpenAIVoice | undefined;
  if (envVoice && ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(envVoice)) {
    return envVoice;
  }
  return "nova";
}

export function getTTSSpeed(langCode?: string): number {
  const base = langCode?.split("-")[0].toLowerCase() || "en";
  if (["zh", "ja", "ko"].includes(base)) return 0.95;
  if (["ar", "fa", "ur", "he"].includes(base)) return 0.92;
  if (["uz", "ru", "tr", "kk", "ky", "tg", "az"].includes(base)) return 1.0;
  if (["en", "es", "fr", "de", "pt", "it"].includes(base)) return 1.05;
  return 1.0;
}

export function getTTSModel(): "tts-1" | "tts-1-hd" {
  const model = process.env.OPENAI_TTS_MODEL;
  if (model === "tts-1" || model === "tts-1-hd") return model;
  return "tts-1-hd";
}
