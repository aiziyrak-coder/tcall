import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { transcribeAudio, translateForInterpreter, textToSpeech } from "@/lib/openai";
import { clampTranscript } from "@/lib/call-service";
import { isValidTranscript } from "@/lib/call-translation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`interpreter:${session.userId}:${clientIp(req)}`, 45, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p so'rov. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const sourceLang = (formData.get("sourceLang") as string) || session.language;
    const targetLang = (formData.get("targetLang") as string) || "en";
    const withSpeech = formData.get("withSpeech") !== "false";
    const contextRaw = formData.get("context") as string | null;

    if (!audio) {
      return NextResponse.json({ error: "Audio fayl topilmadi" }, { status: 400 });
    }

    if (audio.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Fayl juda katta" }, { status: 413 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    if (buffer.length < 800) {
      return NextResponse.json({ error: "no_speech", original: "", translated: "" }, { status: 422 });
    }

    let recentLines: string[] = [];
    if (contextRaw) {
      try {
        const parsed = JSON.parse(contextRaw);
        if (Array.isArray(parsed)) recentLines = parsed.filter((x) => typeof x === "string").slice(-8);
      } catch {
        /* ignore */
      }
    }

    const whisperHint = sourceLang === "auto" ? undefined : sourceLang;
    const rawText = await transcribeAudio(buffer, audio.name || "speech.webm", whisperHint);
    if (!isValidTranscript(rawText)) {
      return NextResponse.json({ error: "no_speech", original: "", translated: "" }, { status: 422 });
    }

    const original = clampTranscript(rawText);
    if (!original) {
      return NextResponse.json({ error: "no_speech", original: "", translated: "" }, { status: 422 });
    }

    if (sourceLang === targetLang) {
      let audioBase64: string | undefined;
      if (withSpeech) {
        const audioBuf = await textToSpeech(original, targetLang);
        if (audioBuf) audioBase64 = audioBuf.toString("base64");
      }
      return NextResponse.json({ original, translated: original, sourceLang, targetLang, audioBase64 });
    }

    const effectiveSource = sourceLang === "auto" ? session.language : sourceLang;
    const translated = await translateForInterpreter(original, effectiveSource, targetLang, recentLines);

    let audioBase64: string | undefined;
    if (translated.trim()) {
      const audioBuf = await textToSpeech(translated, targetLang);
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
