import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canJoinCall } from "@/lib/call-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidRoomId } from "@/lib/utils";
import { guardUser } from "@/lib/user-guard";

const MAX_PARTICIPANTS = 2;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`join:${session.userId}:${clientIp(req)}`, 30, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    // Ban va Premium+ tekshiruvi
    const guard = await guardUser(session.userId, "premium_plus");
    if (!guard.ok) {
      return NextResponse.json(
        {
          error: guard.error,
          code: guard.code,
          requiresPlan: guard.requiresPlan,
          currentPlan: guard.currentPlan,
        },
        { status: guard.status }
      );
    }

    const body = await req.json();
    const roomId = body?.roomId?.toString().toUpperCase();
    if (!roomId || !isValidRoomId(roomId)) {
      return NextResponse.json({ error: "Qo'ng'iroq kodi kerak" }, { status: 400 });
    }

    const txResult = await prisma.$transaction(async (tx) => {
      const call = await tx.call.findUnique({
        where: { roomId },
        include: {
          host: { select: { id: true, name: true, tcallId: true, language: true } },
          participants: {
            include: { user: { select: { name: true, language: true, tcallId: true } } },
          },
        },
      });

      if (!call) return { kind: "error" as const, error: "Qo'ng'iroq topilmadi", status: 404 };

      if (!["waiting", "ringing", "active"].includes(call.status)) {
        return { kind: "error" as const, error: "Qo'ng'iroq allaqachon tugagan", status: 410 };
      }

      const access = await canJoinCall(call, session.userId, session.tcallId);
      if (!access.ok) return { kind: "error" as const, error: access.reason, status: 403 };

      const alreadyJoined = call.participants.some((p) => p.userId === session.userId);
      if (!alreadyJoined && call.participants.length >= MAX_PARTICIPANTS) {
        return { kind: "error" as const, error: "Qo'ng'iroq band", status: 409 };
      }

      if (!alreadyJoined) {
        await tx.callParticipant.create({
          data: { callId: call.id, userId: session.userId },
        });
      }

      const participantCount = alreadyJoined ? call.participants.length : call.participants.length + 1;

      if (participantCount >= MAX_PARTICIPANTS && ["waiting", "ringing"].includes(call.status)) {
        await tx.call.updateMany({
          where: { id: call.id, status: { in: ["waiting", "ringing"] } },
          data: { status: "active" },
        });
      }

      return { kind: "ok" as const, call, participantCount };
    });

    if (txResult.kind === "error") {
      return NextResponse.json({ error: txResult.error }, { status: txResult.status });
    }

    const { call, participantCount } = txResult;
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
