import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const postSchema = z.object({
  tcallId: z.string().regex(/^\d{9}$/),
});

const patchSchema = z.object({
  requesterTcallId: z.string().regex(/^\d{9}$/),
  accept: z.boolean(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const incoming = await prisma.unblockRequest.findMany({
    where: { blockerId: session.userId, status: "pending" },
    include: {
      requester: { select: { id: true, name: true, tcallId: true, language: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    incoming: incoming.map((r) => ({
      id: r.id,
      requester: r.requester,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.tcallId) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`unblock-req:${session.userId}`, 5, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Juda ko'p so'rov" }, { status: 429 });

  try {
    const { tcallId } = postSchema.parse(await req.json());
    const blocker = await prisma.user.findUnique({ where: { tcallId } });
    if (!blocker) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    const blocked = await prisma.blockedUser.findFirst({
      where: { blockerId: blocker.id, blockedTcallId: session.tcallId },
    });
    if (!blocked) {
      return NextResponse.json({ error: "Siz bloklanmagansiz" }, { status: 400 });
    }

    const existing = await prisma.unblockRequest.findUnique({
      where: { requesterId_blockerId: { requesterId: session.userId, blockerId: blocker.id } },
    });
    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json({ ok: true, already: true });
      }
      return NextResponse.json({ error: "Iltimos allaqachon yuborilgan" }, { status: 400 });
    }

    await prisma.unblockRequest.create({
      data: { requesterId: session.userId, blockerId: blocker.id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const { requesterTcallId, accept } = patchSchema.parse(await req.json());
    const requester = await prisma.user.findUnique({ where: { tcallId: requesterTcallId } });
    if (!requester) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const request = await prisma.unblockRequest.findUnique({
      where: { requesterId_blockerId: { requesterId: requester.id, blockerId: session.userId } },
    });
    if (!request || request.status !== "pending") {
      return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });
    }

    if (accept) {
      await prisma.$transaction([
        prisma.blockedUser.deleteMany({
          where: { blockerId: session.userId, blockedTcallId: requesterTcallId },
        }),
        prisma.unblockRequest.update({
          where: { id: request.id },
          data: { status: "accepted", resolvedAt: new Date() },
        }),
      ]);
    } else {
      await prisma.unblockRequest.update({
        where: { id: request.id },
        data: { status: "rejected", resolvedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, accepted: accept });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
