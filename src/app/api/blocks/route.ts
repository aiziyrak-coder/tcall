import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  tcallId: z.string().regex(/^\d{9}$/),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const blocks = await prisma.blockedUser.findMany({
    where: { blockerId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ blocks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`block:${session.userId}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });
  }

  try {
    const { tcallId } = schema.parse(await req.json());
    if (tcallId === session.tcallId) {
      return NextResponse.json({ error: "O'zingizni bloklab bo'lmaydi" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { tcallId } });
    if (!exists) return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });

    const block = await prisma.blockedUser.upsert({
      where: { blockerId_blockedTcallId: { blockerId: session.userId, blockedTcallId: tcallId } },
      create: { blockerId: session.userId, blockedTcallId: tcallId },
      update: {},
    });

    return NextResponse.json({ block });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const tcallId = req.nextUrl.searchParams.get("tcallId")?.replace(/\D/g, "");
  if (!tcallId) return NextResponse.json({ error: "tcallId kerak" }, { status: 400 });

  await prisma.blockedUser.deleteMany({
    where: { blockerId: session.userId, blockedTcallId: tcallId },
  });

  return NextResponse.json({ ok: true });
}
