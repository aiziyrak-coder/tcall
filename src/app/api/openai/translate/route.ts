import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { translateWithGPT, textToSpeech } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const { text, sourceLang, targetLang, withSpeech } = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json({ error: "Majburiy maydonlar yo'q" }, { status: 400 });
    }

    const translated = await translateWithGPT(text, sourceLang, targetLang);

    let audioBase64: string | undefined;
    if (withSpeech && translated && sourceLang !== targetLang) {
      const audio = await textToSpeech(translated);
      if (audio) {
        audioBase64 = audio.toString("base64");
      }
    }

    return NextResponse.json({ original: text, translated, audioBase64 });
  } catch (e) {
    console.error("OpenAI translate API error:", e);
    return NextResponse.json({ error: "Tarjima xatosi" }, { status: 500 });
  }
}
