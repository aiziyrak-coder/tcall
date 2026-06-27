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

/** Exponential backoff retry — OpenAI 429/5xx xatolari uchun */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 800
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

/** Whisper — nutqni matnga aylantirish */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  hintLang?: string,
  whisperLangOverride?: string,
  options?: { interpreterMode?: boolean; fast?: boolean }
): Promise<{ text: string; language?: string }> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)]);
  formData.append("file", blob, filename);
  formData.append("model", "whisper-1");
  formData.append("response_format", options?.fast ? "json" : "verbose_json");
  formData.append("temperature", "0");

  const whisperLang =
    whisperLangOverride ?? (hintLang ? getWhisperLanguage(hintLang) : undefined);
  if (whisperLang) formData.append("language", whisperLang);
  if (hintLang && !options?.interpreterMode) {
    formData.append("prompt", getWhisperPrompt(hintLang));
  }

  const timeoutMs = options?.fast ? 14_000 : 30_000;
  const maxAttempts = options?.fast ? 2 : 3;

  const res = await withRetry(
    () =>
      fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${requireApiKey()}` },
        body: formData,
        signal: AbortSignal.timeout(timeoutMs),
      }),
    maxAttempts,
    options?.fast ? 350 : 800
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Whisper error:", err);
    return { text: "" };
  }

  const data = await res.json();
  const text = (data.text as string)?.trim() || "";
  const language = typeof data.language === "string" ? data.language : undefined;
  return { text, language };
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

  const res = await withRetry(() =>
    fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `You are an expert multilingual chat translator specializing in instant messaging.
Translate from ${sourceName} to ${targetName} with maximum naturalness and accuracy.

Rules:
- Preserve exact meaning, tone, slang, humor, and emotional intent.
- Use idiomatic ${targetName} that native speakers use in chat apps (WhatsApp/Telegram style).
- Fix grammar in the translation without changing meaning.
- Keep emojis, @mentions, URLs, numbers, and proper nouns when appropriate.
- Do NOT add explanations, quotes, or extra text.
- Return ONLY the translated message.`,
          },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    })
  );

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

/** GPT — yuzma-yuz tarjimon: faqat eshitilgan matn, hech narsa qo'shmasdan */
export async function translateForInterpreter(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const res = await withRetry(
    () =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${requireApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getModel(),
          temperature: 0,
          max_tokens: 220,
          messages: [
            {
              role: "system",
              content: `Translate from ${sourceName} to ${targetName}. Return ONLY the translation. No extra words.`,
            },
            { role: "user", content: text },
          ],
        }),
        signal: AbortSignal.timeout(12_000),
      }),
    2,
    350
  );

  if (!res.ok) {
    console.error("GPT interpreter translate error:", await res.text());
    return text;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

/** OpenAI TTS — tilga mos ovoz bilan tarjima matnini o'qish */
export async function textToSpeech(
  text: string,
  langHint?: string,
  opts?: { fast?: boolean }
): Promise<Buffer | null> {
  if (!text.trim()) return null;

  const voice = getTTSVoice(langHint);
  const baseSpeed = getTTSSpeed(langHint);
  const speed = opts?.fast ? Math.min(baseSpeed + 0.1, 1.25) : baseSpeed;
  const primary = opts?.fast ? "tts-1" : getTTSModel();

  async function synth(model: "tts-1" | "tts-1-hd"): Promise<Buffer | null> {
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
      signal: AbortSignal.timeout(opts?.fast ? 12_000 : 25_000),
    });

    if (!res.ok) {
      console.error(`TTS error (${model}):`, await res.text());
      return null;
    }

    return Buffer.from(await res.arrayBuffer());
  }

  const first = await synth(primary);
  if (first) return first;
  if (primary === "tts-1-hd") return synth("tts-1");
  return null;
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
