import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitToUser } from "@/lib/socket-io";
import { generateRoomId } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const body = await req.json();
    const targetId = body?.tcallId?.toString().replace(/\D/g, "");
    if (!targetId || targetId.length !== 9) {
      return NextResponse.json({ error: "9 xonali raqam kiriting" }, { status: 400 });
    }

    if (targetId === session.tcallId) {
      return NextResponse.json({ error: "O'zingizga qo'ng'iroq qilib bo'lmaydi" }, { status: 400 });
    }

    const callee = await prisma.user.findUnique({
      where: { tcallId: targetId },
      select: { id: true, name: true, language: true, tcallId: true },
    });

    if (!callee) {
      return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });
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
        calleeTcallId: targetId,
        status: "ringing",
        participants: { create: { userId: session.userId } },
      },
    });

    const caller = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, language: true, tcallId: true },
    });

    emitToUser(callee.id, "incoming-call", {
      roomId: call.roomId,
      callId: call.id,
      caller: {
        userId: session.userId,
        name: caller?.name || session.name,
        language: caller?.language || session.language,
        tcallId: caller?.tcallId || session.tcallId,
      },
    });

    return NextResponse.json({
      roomId: call.roomId,
      callId: call.id,
      callee: {
        userId: callee.id,
        name: callee.name,
        tcallId: callee.tcallId,
        language: callee.language,
      },
    });
  } catch (e) {
    console.error("Dial error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
