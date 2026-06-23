import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRoomId } from "@/lib/utils";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

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
      status: "waiting",
      participants: {
        create: { userId: session.userId },
      },
    },
  });

  return NextResponse.json({ roomId: call.roomId, callId: call.id });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const calls = await prisma.call.findMany({
    where: {
      OR: [{ hostId: session.userId }, { participants: { some: { userId: session.userId } } }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      host: { select: { name: true, language: true } },
      participants: {
        include: { user: { select: { name: true, language: true } } },
      },
    },
  });

  return NextResponse.json({ calls });
}
