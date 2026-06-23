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
      return NextResponse.json({ error: "Xona kodi kerak" }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { roomId },
      include: {
        host: { select: { name: true, language: true, id: true } },
        participants: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Xona topilmadi" }, { status: 404 });
    }

    const alreadyJoined = call.participants.some((p) => p.userId === session.userId);

    if (!alreadyJoined && call.participants.length >= MAX_PARTICIPANTS) {
      return NextResponse.json({ error: "Xona to'liq (maksimum 2 kishi)" }, { status: 409 });
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

    return NextResponse.json({
      roomId: call.roomId,
      callId: call.id,
      host: call.host,
      status: participantCount >= MAX_PARTICIPANTS ? "active" : call.status,
      isHost: call.hostId === session.userId,
    });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
