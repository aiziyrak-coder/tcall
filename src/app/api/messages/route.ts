import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getConversationsForUser, sendDirectMessage } from "@/lib/chat-service";

const sendSchema = z.object({
  recipientTcallId: z.string().regex(/^\d{9}$/),
  message: z.string().min(1).max(2000),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.tcallId) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const { conversations, unreadTotal } = await getConversationsForUser(
    session.userId,
    session.language || "uz"
  );

  return NextResponse.json({ conversations, unreadCount: unreadTotal, inbox: [], sent: [] });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.tcallId) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const limited = rateLimit(`msg:${session.userId}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Juda ko'p xabar. ${limited.retryAfterSec}s kuting` },
      { status: 429 }
    );
  }

  try {
    const { recipientTcallId, message } = sendSchema.parse(await req.json());
    const result = await sendDirectMessage(
      session.userId,
      session.tcallId,
      session.language || "uz",
      recipientTcallId,
      message
    );
    return NextResponse.json({ message: { id: result.msg.id }, conversationId: result.msg.conversationId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    if (e instanceof Error) {
      if (e.message === "NOT_FOUND") return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });
      if (e.message === "BLOCKED") return NextResponse.json({ error: "Xabar yuborib bo'lmaydi" }, { status: 403 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
