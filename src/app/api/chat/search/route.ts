import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`chat-search:${session.userId}`, 20, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Juda ko'p so'rov" }, { status: 429 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const conversationId = req.nextUrl.searchParams.get("conversationId");

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const myConvIds = await prisma.conversationMember.findMany({
    where: { userId: session.userId },
    select: { conversationId: true },
  });
  const allowedIds = myConvIds.map((m) => m.conversationId);

  const whereConvId = conversationId && allowedIds.includes(conversationId)
    ? conversationId
    : undefined;

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId: whereConvId ? whereConvId : { in: allowedIds },
      originalText: { contains: q },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      sender: { select: { id: true, name: true } },
      conversation: { select: { id: true, name: true, type: true } },
    },
  });

  return NextResponse.json({
    results: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      conversationName: m.conversation.name,
      conversationType: m.conversation.type,
      text: m.originalText,
      sender: m.sender,
      createdAt: m.createdAt,
    })),
  });
}
