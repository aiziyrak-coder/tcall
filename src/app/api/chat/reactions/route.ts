import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitToUser } from "@/lib/socket-io";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "🎉", "💯"];

const schema = z.object({
  messageId: z.string().min(1).max(40),
  emoji: z.string().min(1).max(8),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`reaction:${session.userId}`, 30, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Juda ko'p" }, { status: 429 });

  try {
    const { messageId, emoji } = schema.parse(await req.json());

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Noto'g'ri emoji" }, { status: 400 });
    }

    const msg = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { members: { select: { userId: true } } } } },
    });
    if (!msg) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });

    const isMember = msg.conversation.members.some((m) => m.userId === session.userId);
    if (!isMember) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

    // Toggle: allaqachon qo'shilgan bo'lsa — o'chiramiz
    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: session.userId, emoji } },
    });

    let action: "added" | "removed";
    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      action = "removed";
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId: session.userId, emoji },
      });
      action = "added";
    }

    const reactions = await prisma.messageReaction.groupBy({
      by: ["emoji"],
      where: { messageId },
      _count: { emoji: true },
    });
    const summary = reactions.map((r) => ({ emoji: r.emoji, count: r._count.emoji }));

    // Boshqa a'zolarga xabar yuborish
    for (const member of msg.conversation.members) {
      if (member.userId !== session.userId) {
        emitToUser(member.userId, "message-reaction", {
          messageId,
          conversationId: msg.conversationId,
          emoji,
          userId: session.userId,
          action,
          summary,
        });
      }
    }

    return NextResponse.json({ ok: true, action, summary });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
