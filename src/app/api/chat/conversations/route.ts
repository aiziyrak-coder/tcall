import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createGroupConversation,
  findOrCreateDirectConversation,
  getConversationsForUser,
  isBlockedBetween,
} from "@/lib/chat-service";
import { getUserLanguage } from "@/lib/chat-translate";

const createDirectSchema = z.object({
  tcallId: z.string().regex(/^\d{9}$/),
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  memberTcallIds: z.array(z.string().regex(/^\d{9}$/)).min(1).max(20),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.tcallId) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const userLang = await getUserLanguage(session.userId, session.language || "uz");

  const { conversations, unreadTotal } = await getConversationsForUser(
    session.userId,
    userLang
  );

  return NextResponse.json({ conversations, unreadCount: unreadTotal });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.tcallId) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.type === "group") {
      const { name, memberTcallIds } = createGroupSchema.parse(body);
      const users = await prisma.user.findMany({
        where: { tcallId: { in: memberTcallIds } },
        select: { id: true, tcallId: true },
      });
      if (users.length === 0) {
        return NextResponse.json({ error: "A'zolar topilmadi" }, { status: 404 });
      }

      for (const u of users) {
        const blocked = await isBlockedBetween(
          session.userId,
          session.tcallId,
          u.id,
          u.tcallId!
        );
        if (blocked) {
          return NextResponse.json({ error: "Ba'zi foydalanuvchilar bloklangan" }, { status: 403 });
        }
      }

      const id = await createGroupConversation(
        session.userId,
        name,
        users.map((u) => u.id)
      );
      return NextResponse.json({ conversationId: id });
    }

    const { tcallId } = createDirectSchema.parse(body);
    const recipient = await prisma.user.findUnique({ where: { tcallId } });
    if (!recipient) return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });

    const blocked = await isBlockedBetween(
      session.userId,
      session.tcallId,
      recipient.id,
      tcallId
    );
    if (blocked) {
      return NextResponse.json({ error: "Xabar yuborib bo'lmaydi" }, { status: 403 });
    }

    const conversationId = await findOrCreateDirectConversation(session.userId, recipient.id);
    return NextResponse.json({ conversationId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
