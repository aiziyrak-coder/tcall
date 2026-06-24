import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { endStaleCallsForUser, userHasActiveCall } from "@/lib/call-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { generateRoomId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const limited = rateLimit(`room:${session.userId}:${clientIp(req)}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Juda ko'p xona. ${limited.retryAfterSec}s kuting` },
      { status: 429 }
    );
  }

  if (await userHasActiveCall(session.userId, session.tcallId)) {
    return NextResponse.json({ error: "Siz allaqachon qo'ng'iroqdasiz" }, { status: 409 });
  }

  await endStaleCallsForUser(session.userId, session.tcallId);

  let roomId = generateRoomId();
  let exists = await prisma.call.findUnique({ where: { roomId } });
  while (exists) {
    roomId = generateRoomId();
    exists = await prisma.call.findUnique({ where: { roomId } });
  }

  const call = await prisma.call.create({
    data: {
      roomId,
      hostId: session.userId,
      callType: "room",
      status: "waiting",
      participants: { create: { userId: session.userId } },
    },
  });

  return NextResponse.json({ roomId: call.roomId, callId: call.id });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const calls = await prisma.call.findMany({
    where: {
      OR: [{ hostId: session.userId }, { participants: { some: { userId: session.userId } } }],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      host: { select: { name: true, language: true, tcallId: true } },
      participants: {
        include: { user: { select: { name: true, language: true, tcallId: true } } },
      },
    },
  });

  return NextResponse.json({ calls });
}
