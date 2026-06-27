import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { translateForInterpreter, textToSpeech } from "@/lib/openai";
import { clampTranscript } from "@/lib/call-service";
import { isValidInterpreterTranscript } from "@/lib/call-translation";
import { isSupportedLanguage } from "@/lib/languages";
import { pickFilename, transcribeForInterpreter } from "@/lib/interpreter-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MIN_RECORD_MS = 700;
const MIN_AUDIO_BYTES = 900;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`interpreter:${session.userId}:${clientIp(req)}`, 60, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "rate_limit", retryAfterSec: limited.retryAfterSec },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const sourceLang = (formData.get("sourceLang") as string) || session.language;
    const targetLang = (formData.get("targetLang") as string) || "en";
    const withSpeech = formData.get("withSpeech") !== "false";
    const recordMs = parseInt(String(formData.get("recordMs") || "0"), 10);

    if (sourceLang !== "auto" && !isSupportedLanguage(sourceLang)) {
      return NextResponse.json({ error: "Noto'g'ri manba tili" }, { status: 400 });
    }
    if (!isSupportedLanguage(targetLang)) {
      return NextResponse.json({ error: "Noto'g'ri maqsad tili" }, { status: 400 });
    }

    if (!audio) {
      return NextResponse.json({ error: "Audio fayl topilmadi" }, { status: 400 });
    }

    if (audio.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Fayl juda katta" }, { status: 413 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    if (buffer.length < MIN_AUDIO_BYTES) {
      return NextResponse.json({ error: "no_speech", original: "", translated: "" }, { status: 422 });
    }
    if (recordMs > 0 && recordMs < MIN_RECORD_MS) {
      return NextResponse.json({ error: "no_speech", original: "", translated: "" }, { status: 422 });
    }

    const filename = pickFilename(audio.name || "speech.webm", buffer);
    const whisperHint = sourceLang === "auto" ? undefined : sourceLang;
    const rawText = await transcribeForInterpreter(buffer, filename, whisperHint);

    if (!isValidInterpreterTranscript(rawText, buffer.length)) {
      console.warn("Interpreter no speech:", { bytes: buffer.length, type: audio.type, sourceLang, targetLang });
      return NextResponse.json({ error: "no_speech", original: "", translated: "" }, { status: 422 });
    }

    const original = clampTranscript(rawText);
    if (!original) {
      return NextResponse.json({ error: "no_speech", original: "", translated: "" }, { status: 422 });
    }

    if (sourceLang === targetLang) {
      let audioBase64: string | undefined;
      if (withSpeech) {
        const audioBuf = await textToSpeech(original, targetLang, { fast: true });
        if (audioBuf) audioBase64 = audioBuf.toString("base64");
      }
      return NextResponse.json({ original, translated: original, sourceLang, targetLang, audioBase64 });
    }

    const effectiveSource = sourceLang === "auto" ? session.language : sourceLang;
    const translated = await translateForInterpreter(original, effectiveSource, targetLang);

    let audioBase64: string | undefined;
    if (withSpeech && translated.trim()) {
      const audioBuf = await textToSpeech(translated, targetLang, { fast: true });
      if (audioBuf) audioBase64 = audioBuf.toString("base64");
    }

    return NextResponse.json({
      original,
      translated,
      sourceLang: effectiveSource,
      targetLang,
      audioBase64,
    });
  } catch (e) {
    console.error("Interpreter process error:", e);
    return NextResponse.json({ error: "Tarjima xatosi" }, { status: 500 });
  }
}
