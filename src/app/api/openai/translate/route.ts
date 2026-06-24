import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { translateWithGPT, textToSpeech } from "@/lib/openai";
import { clampTranscript } from "@/lib/call-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`translate:${session.userId}:${clientIp(req)}`, 30, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p so'rov. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const { text, sourceLang, targetLang, withSpeech } = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json({ error: "Majburiy maydonlar yo'q" }, { status: 400 });
    }

    const safeText = clampTranscript(String(text));
    if (!safeText) {
      return NextResponse.json({ error: "Matn bo'sh" }, { status: 400 });
    }

    const translated = await translateWithGPT(safeText, sourceLang, targetLang);

    let audioBase64: string | undefined;
    if (withSpeech && translated && sourceLang !== targetLang) {
      const audio = await textToSpeech(translated, targetLang);
      if (audio) {
        audioBase64 = audio.toString("base64");
      }
    }

    return NextResponse.json({ original: safeText, translated, audioBase64 });
  } catch (e) {
    console.error("OpenAI translate API error:", e);
    return NextResponse.json({ error: "Tarjima xatosi" }, { status: 500 });
  }
}
