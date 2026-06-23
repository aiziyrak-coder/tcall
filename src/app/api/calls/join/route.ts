import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_PARTICIPANTS = 2;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const body = await req.json();
    const roomId = body?.roomId?.toString().toUpperCase();
    if (!roomId) {
      return NextResponse.json({ error: "Qo'ng'iroq kodi kerak" }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { roomId },
      include: {
        host: { select: { name: true, language: true, id: true, tcallId: true } },
        participants: {
          include: { user: { select: { name: true, language: true, tcallId: true } } },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Qo'ng'iroq topilmadi" }, { status: 404 });
    }

    if (call.status === "ended") {
      return NextResponse.json({ error: "Qo'ng'iroq tugagan" }, { status: 410 });
    }

    const alreadyJoined = call.participants.some((p) => p.userId === session.userId);

    if (!alreadyJoined && call.participants.length >= MAX_PARTICIPANTS) {
      return NextResponse.json({ error: "Qo'ng'iroq band" }, { status: 409 });
    }

    if (!alreadyJoined) {
      await prisma.callParticipant.create({
        data: { callId: call.id, userId: session.userId },
      });
    }

    const participantCount = alreadyJoined
      ? call.participants.length
      : call.participants.length + 1;

    if (participantCount >= MAX_PARTICIPANTS) {
      await prisma.call.update({
        where: { id: call.id },
        data: { status: "active" },
      });
    }

    const partner = call.participants.find((p) => p.userId !== session.userId)?.user
      || (call.hostId !== session.userId ? call.host : null);

    return NextResponse.json({
      roomId: call.roomId,
      callId: call.id,
      host: call.host,
      partner,
      status: participantCount >= MAX_PARTICIPANTS ? "active" : call.status,
      isHost: call.hostId === session.userId,
    });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
