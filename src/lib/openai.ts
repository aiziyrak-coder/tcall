import { getLanguageName } from "./languages";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
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
  if (language) formData.append("language", language);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${getApiKey()}` },
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

  const sourceName = getLanguageName(sourceLang);
  const targetName = getLanguageName(targetLang);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
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
      Authorization: `Bearer ${getApiKey()}`,
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

/** OpenAI TTS — tarjima qilingan matnni ovozga aylantirish */
export async function textToSpeech(text: string): Promise<Buffer | null> {
  if (!text.trim()) return null;

  const voice = process.env.OPENAI_TTS_VOICE || "nova";

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text.slice(0, 4096),
      voice,
      speed: 1.05,
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
      Authorization: `Bearer ${getApiKey()}`,
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
