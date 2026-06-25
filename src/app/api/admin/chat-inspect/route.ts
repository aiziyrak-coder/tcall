import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 30;

  if (conversationId) {
    const [conv, messages] = await Promise.all([
      prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          members: { include: { user: { select: { name: true, email: true, tcallId: true } } } },
        },
      }),
      prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { sender: { select: { name: true, email: true } } },
      }),
    ]);
    return NextResponse.json({ conv, messages });
  }

  // Suhbatlar ro'yxati
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { members: { some: { user: { name: { contains: q } } } } },
        ],
      }
    : {};

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        members: { include: { user: { select: { name: true, email: true, tcallId: true } } }, take: 5 },
        messages: { take: 1, orderBy: { createdAt: "desc" }, select: { originalText: true, createdAt: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return NextResponse.json({ conversations, total, page, pages: Math.ceil(total / limit) });
}
