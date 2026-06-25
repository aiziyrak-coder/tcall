import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendUserSupportMessage, getUserThread, getUserUnreadCount } from "@/lib/support";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("unread") === "1") {
    const unread = await getUserUnreadCount(session.userId);
    return NextResponse.json({ unread });
  }

  const messages = await getUserThread(session.userId);
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.sender === "user" ? m.originalText : m.translatedText || m.originalText,
      createdAt: m.createdAt,
    })),
  });
}

const sendSchema = z.object({ text: z.string().min(1).max(2000) });

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`support:${session.userId}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: `Juda ko'p xabar. ${limited.retryAfterSec}s kuting` }, { status: 429 });
  }

  try {
    const { text } = sendSchema.parse(await req.json());
    const msg = await sendUserSupportMessage(session.userId, text.trim());
    return NextResponse.json({
      ok: true,
      message: { id: msg.id, sender: "user", text: msg.originalText, createdAt: msg.createdAt },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Xabar bo'sh" }, { status: 400 });
    console.error("Support send error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
