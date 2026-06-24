import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canJoinCall, getCallByRoomId } from "@/lib/call-service";

const MAX_PARTICIPANTS = 2;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const body = await req.json();
    const roomId = body?.roomId?.toString().toUpperCase();
    if (!roomId) {
      return NextResponse.json({ error: "Qo'ng'iroq kodi kerak" }, { status: 400 });
    }

    const call = await getCallByRoomId(roomId);
    if (!call) {
      return NextResponse.json({ error: "Qo'ng'iroq topilmadi" }, { status: 404 });
    }

    const access = await canJoinCall(call, session.userId, session.tcallId);
    if (!access.ok) {
      return NextResponse.json({ error: access.reason }, { status: 403 });
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

    const participantCount = alreadyJoined ? call.participants.length : call.participants.length + 1;

    if (participantCount >= MAX_PARTICIPANTS && call.status !== "active") {
      await prisma.call.update({
        where: { id: call.id },
        data: { status: "active" },
      });
    }

    const partner =
      call.participants.find((p) => p.userId !== session.userId)?.user
      ?? (call.hostId !== session.userId ? call.host : null);

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
