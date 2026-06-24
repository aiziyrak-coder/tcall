import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const roomId = req.nextUrl.searchParams.get("roomId")?.toUpperCase();
  if (!roomId) return NextResponse.json({ error: "roomId kerak" }, { status: 400 });

  const call = await prisma.call.findUnique({
    where: { roomId },
    include: {
      host: { select: { name: true, tcallId: true, language: true } },
      participants: { include: { user: { select: { name: true, tcallId: true, language: true } } } },
      transcripts: { orderBy: { createdAt: "asc" }, take: 100 },
    },
  });

  if (!call) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const isParticipant =
    call.hostId === session.userId || call.participants.some((p) => p.userId === session.userId);
  if (!isParticipant) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  return NextResponse.json({ call });
}
