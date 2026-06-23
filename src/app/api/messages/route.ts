import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitToUser } from "@/lib/socket-io";
import { rateLimit } from "@/lib/rate-limit";

const sendSchema = z.object({
  recipientTcallId: z.string().regex(/^\d{9}$/),
  message: z.string().min(1).max(300),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const [inbox, sent] = await Promise.all([
    prisma.quickMessage.findMany({
      where: { recipientTcallId: session.tcallId! },
      include: { sender: { select: { name: true, tcallId: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.quickMessage.findMany({
      where: { senderId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const unreadCount = inbox.filter((m) => !m.read).length;

  return NextResponse.json({ inbox, sent, unreadCount });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`msg:${session.userId}`, 15, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Juda ko'p xabar. ${limited.retryAfterSec}s kuting` },
      { status: 429 }
    );
  }

  try {
    const { recipientTcallId, message } = sendSchema.parse(await req.json());

    const recipient = await prisma.user.findUnique({ where: { tcallId: recipientTcallId } });
    if (!recipient) return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });

    const blocked = await prisma.blockedUser.findFirst({
      where: { blockerId: recipient.id, blockedTcallId: session.tcallId! },
    });
    if (blocked) return NextResponse.json({ error: "Xabar yuborib bo'lmaydi" }, { status: 403 });

    const msg = await prisma.quickMessage.create({
      data: { senderId: session.userId, recipientTcallId, message },
    });

    emitToUser(recipient.id, "quick-message", {
      id: msg.id,
      message,
      sender: { name: session.name, tcallId: session.tcallId },
    });

    return NextResponse.json({ message: msg });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids kerak" }, { status: 400 });

  await prisma.quickMessage.updateMany({
    where: { id: { in: ids }, recipientTcallId: session.tcallId! },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
