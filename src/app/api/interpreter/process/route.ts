import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { transcribeAudio, translateForInterpreter, textToSpeech } from "@/lib/openai";
import { clampTranscript } from "@/lib/call-service";
import { isValidTranscript } from "@/lib/call-translation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function pickFilename(name: string, buffer: Buffer): string {
  if (name && name.includes(".")) return name;
  const head = buffer.subarray(0, 12);
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "speech.webm";
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return "speech.mp4";
  if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46) return "speech.wav";
  return name || "speech.webm";
}

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
    if (buffer.length < 350) {
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

    const filename = pickFilename(audio.name || "speech.webm", buffer);
    const whisperHint = sourceLang === "auto" ? undefined : sourceLang;

    let rawText = await transcribeAudio(buffer, filename, whisperHint);
    if (!isValidTranscript(rawText) && whisperHint) {
      rawText = await transcribeAudio(buffer, filename, undefined);
    }
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
