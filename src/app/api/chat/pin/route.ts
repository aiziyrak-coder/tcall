import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  conversationId: z.string().min(1),
  pinned: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const { conversationId, pinned } = schema.parse(await req.json());

    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: session.userId } },
    });
    if (!member) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

    await prisma.conversationMember.update({
      where: { id: member.id },
      data: { pinnedAt: pinned ? new Date() : null },
    });

    return NextResponse.json({ ok: true, pinned });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
