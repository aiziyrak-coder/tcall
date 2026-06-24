import { getLanguageName } from "./languages";
import { getWhisperLanguage, getWhisperPrompt } from "./call-translation";
import { getTTSModel, getTTSSpeed, getTTSVoice } from "./tts-config";

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null;
}

function requireApiKey(): string {
  const key = getApiKey();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

/** Whisper — nutqni matnga aylantirish */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  language?: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)]);
  formData.append("file", blob, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", "json");
  formData.append("temperature", "0");

  const whisperLang = language ? getWhisperLanguage(language) : undefined;
  if (whisperLang) formData.append("language", whisperLang);
  if (language) formData.append("prompt", getWhisperPrompt(language));

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${requireApiKey()}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Whisper error:", err);
    return "";
  }

  const data = await res.json();
  return (data.text as string)?.trim() || "";
}

/** GPT — chat xabarlari uchun aniq, grammatik to'g'ri tarjima */
export async function translateForChat(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("OPENAI_API_KEY missing — chat translation skipped");
    return text;
  }

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.15,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are a professional chat message translator. Translate from ${sourceName} to ${targetName}.
Rules:
- Preserve the exact meaning, tone, and intent of the original message.
- Use natural, grammatically correct ${targetName} that reads like a native speaker wrote it.
- Do NOT add, omit, or summarize information.
- Keep emojis and proper nouns unchanged when appropriate.
- Return ONLY the translated message text, nothing else.`,
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    console.error("GPT chat translate error:", await res.text());
    return text;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

/** GPT — real-time qo'ng'iroq tarjimasi (kontekst bilan) */
export async function translateForCall(
  text: string,
  sourceLang: string,
  targetLang: string,
  recentLines: string[] = []
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const contextBlock =
    recentLines.length > 0
      ? `\n\nRecent dialogue (context only — do NOT translate these lines):\n${recentLines.slice(-5).join("\n")}`
      : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.15,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are a professional simultaneous interpreter on a live phone call. Translate the speaker's words from ${sourceName} into natural spoken ${targetName}.

Rules:
- Preserve exact meaning, intent, and tone (formal/informal).
- Use conversational ${targetName} as heard in real-time interpretation.
- Keep names, numbers, brands, and proper nouns unchanged.
- Do NOT add explanations, notes, or extra words.
- Return ONLY the translated sentence.${contextBlock}`,
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    console.error("GPT call translate error:", await res.text());
    return text;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

/** GPT — real-time tarjima */
export async function translateWithGPT(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are a real-time interpreter for audio calls. Translate the user's speech from ${sourceName} to ${targetName}. Return ONLY the translated text, nothing else. Keep it natural and conversational.`,
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    console.error("GPT translate error:", await res.text());
    return text;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

/** GPT — yuzma-yuz tarjimon (ovozli chiqish uchun optimallashtirilgan) */
export async function translateForInterpreter(
  text: string,
  sourceLang: string,
  targetLang: string,
  recentLines: string[] = []
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const contextBlock =
    recentLines.length > 0
      ? `\n\nRecent dialogue (context only):\n${recentLines.slice(-6).join("\n")}`
      : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.1,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are a world-class simultaneous interpreter for face-to-face conversations. Translate from ${sourceName} to ${targetName} for immediate text-to-speech playback.

Rules:
- Output ONLY natural spoken ${targetName} — as if a native speaker is talking aloud.
- Use short, clear sentences that sound perfect when read by TTS.
- Preserve exact meaning, tone, names, numbers, and intent.
- Do NOT add explanations, notes, brackets, or punctuation meant for reading.
- Do NOT transliterate — write fully in ${targetName} script/alphabet.
- Match formality level of the original speaker.${contextBlock}`,
        },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    console.error("GPT interpreter translate error:", await res.text());
    return text;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

/** OpenAI TTS — tilga mos ovoz bilan tarjima matnini o'qish */
export async function textToSpeech(text: string, langHint?: string): Promise<Buffer | null> {
  if (!text.trim()) return null;

  const voice = getTTSVoice(langHint);
  const speed = getTTSSpeed(langHint);
  const model = getTTSModel();

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: text.slice(0, 4096),
      voice,
      speed,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    console.error("TTS error:", await res.text());
    return null;
  }

  return Buffer.from(await res.arrayBuffer());
}

/** GPT — qisqa xulosa yoki kontekst (keyingi bosqich uchun) */
export async function chatCompletion(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.5,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) return "";
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

/** Qo'ng'iroq transkriptidan AI xulosa */
export async function summarizeCallTranscript(transcript: string): Promise<string> {
  if (!transcript.trim()) return "";
  return chatCompletion(
    "Summarize this phone call transcript in 2-3 concise sentences. Use the same language as the majority of the conversation. Include key topics and any action items.",
    transcript.slice(0, 4000)
  );
}
