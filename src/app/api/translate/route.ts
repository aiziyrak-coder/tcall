import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { translateWithGPT } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json({ error: "Majburiy maydonlar yo'q" }, { status: 400 });
    }

    const translated = await translateWithGPT(text, sourceLang, targetLang);
    return NextResponse.json({ original: text, translated, sourceLang, targetLang });
  } catch {
    return NextResponse.json({ error: "Tarjima xatosi" }, { status: 500 });
  }
}
