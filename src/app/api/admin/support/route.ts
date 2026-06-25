import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { listSupportTickets, getAdminThread, sendAdminSupportReply, countAdminUnread } from "@/lib/support";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (searchParams.get("count") === "1") {
    const unread = await countAdminUnread();
    return NextResponse.json({ unread });
  }

  if (userId) {
    const { user, messages } = await getAdminThread(userId);
    return NextResponse.json({
      user,
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.sender === "user" ? m.translatedText || m.originalText : m.originalText,
        original: m.originalText,
        originalLang: m.originalLang,
        adminEmail: m.adminEmail,
        createdAt: m.createdAt,
      })),
    });
  }

  const tickets = await listSupportTickets();
  return NextResponse.json({ tickets });
}

const replySchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  try {
    const { userId, text } = replySchema.parse(await req.json());
    const msg = await sendAdminSupportReply(userId, text.trim(), session.email);
    return NextResponse.json({
      ok: true,
      message: { id: msg.id, sender: "admin", text: msg.originalText, createdAt: msg.createdAt },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Xabar bo'sh" }, { status: 400 });
    console.error("Admin support reply error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
