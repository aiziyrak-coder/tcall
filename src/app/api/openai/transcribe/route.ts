import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { transcribeAudio } from "@/lib/openai";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`transcribe:${session.userId}`, 120, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Limit. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const language = (formData.get("language") as string) || session.language;

    if (!audio) {
      return NextResponse.json({ error: "Audio fayl topilmadi" }, { status: 400 });
    }

    if (audio.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Fayl juda katta" }, { status: 413 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());

    // Juda kichik bo'laklar — ovoz yo'q
    if (buffer.length < 600) {
      return NextResponse.json({ text: "" });
    }

    const text = await transcribeAudio(buffer, audio.name || "audio.webm", language);
    return NextResponse.json({ text });
  } catch (e) {
    console.error("Transcribe API error:", e);
    return NextResponse.json({ error: "Transkripsiya xatosi" }, { status: 500 });
  }
}
