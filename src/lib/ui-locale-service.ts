import { UI_TEXT, type UILocale } from "./languages";
import { getLanguageName } from "./languages";

export type UIText = (typeof UI_TEXT)["en"];

const STATIC: Set<string> = new Set(Object.keys(UI_TEXT));
const cache = new Map<string, UIText>();
const pending = new Map<string, Promise<UIText>>();

function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY || null;
}

function chunkEntries(obj: Record<string, string>, size: number): Record<string, string>[] {
  const entries = Object.entries(obj);
  const chunks: Record<string, string>[] = [];
  for (let i = 0; i < entries.length; i += size) {
    chunks.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return chunks;
}

async function translateUIChunk(
  chunk: Record<string, string>,
  targetLang: string
): Promise<Record<string, string>> {
  const apiKey = getApiKey();
  if (!apiKey) return chunk;

  const targetName = getLanguageName(targetLang);
  const input = JSON.stringify(chunk);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Translate all JSON string values from English to ${targetName} for a mobile phone app UI called Tcall.
Return ONLY valid JSON with identical keys. Keep "Tcall" brand unchanged. Use natural native ${targetName}.`,
        },
        { role: "user", content: input },
      ],
    }),
  });

  if (!res.ok) return chunk;

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || "";
  try {
    const parsed = JSON.parse(raw.replace(/^```json?\s*|\s*```$/g, "").trim());
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string>;
  } catch {
    /* fallback */
  }
  return chunk;
}

async function buildLocale(targetLang: string): Promise<UIText> {
  if (STATIC.has(targetLang)) {
    return UI_TEXT[targetLang as UILocale] as UIText;
  }

  const base = { ...UI_TEXT.en } as Record<string, string>;
  const chunks = chunkEntries(base, 90);

  for (const chunk of chunks) {
    const translated = await translateUIChunk(chunk, targetLang);
    for (const [k, v] of Object.entries(translated)) {
      if (typeof v === "string" && v.trim()) base[k] = v;
    }
  }

  return base as UIText;
}

export async function getUILocale(lang: string): Promise<UIText> {
  const code = lang.split("-")[0].toLowerCase();
  if (STATIC.has(code)) return UI_TEXT[code as UILocale] as UIText;
  if (cache.has(code)) return cache.get(code)!;

  let job = pending.get(code);
  if (!job) {
    job = buildLocale(code).then((ui) => {
      cache.set(code, ui);
      pending.delete(code);
      return ui;
    });
    pending.set(code, job);
  }
  return job;
}

export function getCachedUILocale(lang: string): UIText | null {
  const code = lang.split("-")[0].toLowerCase();
  if (STATIC.has(code)) return UI_TEXT[code as UILocale] as UIText;
  return cache.get(code) ?? null;
}

export function primeUILocale(lang: string, ui: UIText) {
  cache.set(lang.split("-")[0].toLowerCase(), ui);
}
