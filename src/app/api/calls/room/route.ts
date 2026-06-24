import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canJoinCall, getCallByRoomId } from "@/lib/call-service";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const roomId = req.nextUrl.searchParams.get("roomId")?.toUpperCase();
  if (!roomId || roomId.length < 6) {
    return NextResponse.json({ error: "Xona kodi noto'g'ri" }, { status: 400 });
  }

  const call = await getCallByRoomId(roomId);
  if (!call) {
    return NextResponse.json({ error: "Xona topilmadi" }, { status: 404 });
  }

  const access = await canJoinCall(call, session.userId, session.tcallId);
  const isParticipant = call.participants.some((p) => p.userId === session.userId);
  const isHost = call.hostId === session.userId;
  if (!isParticipant && !isHost && !access.ok) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const full = await prisma.call.findUnique({
    where: { roomId },
    include: {
      host: { select: { id: true, name: true, tcallId: true, language: true } },
      participants: {
        include: { user: { select: { id: true, name: true, tcallId: true, language: true } } },
      },
    },
  });

  if (!full) {
    return NextResponse.json({ error: "Xona topilmadi" }, { status: 404 });
  }

  const participants = full.participants.map((p) => ({
    userId: p.user.id,
    name: p.user.name,
    tcallId: p.user.tcallId,
    language: p.user.language,
    isHost: p.userId === full.hostId,
    joinedAt: p.joinedAt.toISOString(),
  }));

  return NextResponse.json({
    roomId: full.roomId,
    status: full.status,
    maxParticipants: 2,
    participantCount: participants.length,
    participants,
    host: {
      userId: full.host.id,
      name: full.host.name,
      tcallId: full.host.tcallId,
    },
  });
}
