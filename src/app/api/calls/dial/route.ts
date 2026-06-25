import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitToUser, isUserOnline } from "@/lib/socket-io";
import { generateRoomId } from "@/lib/utils";
import { userHasActiveCall, endStaleCallsForUser } from "@/lib/call-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendIncomingCallPush } from "@/lib/push-service";
import { requirePlan } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`dial:${session.userId}:${clientIp(req)}`, 20, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p qo'ng'iroq. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const targetId = body?.tcallId?.toString().replace(/\D/g, "");
    if (!targetId || targetId.length !== 9) {
      return NextResponse.json({ error: "9 xonali raqam kiriting" }, { status: 400 });
    }

    if (targetId === session.tcallId) {
      return NextResponse.json({ error: "O'zingizga qo'ng'iroq qilib bo'lmaydi" }, { status: 400 });
    }

    // Ban tekshirish
    const activeBan = await prisma.userBan.findFirst({
      where: { userId: session.userId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    });
    if (activeBan) {
      return NextResponse.json({ error: `Hisobingiz vaqtincha bloklangan: ${activeBan.reason}` }, { status: 403 });
    }

    // Premium+ obuna tekshirish
    const { ok: canCall, plan } = await requirePlan(session.userId, "premium_plus");
    if (!canCall) {
      return NextResponse.json({
        error: plan === "premium"
          ? "Audio qo'ng'iroq uchun Premium+ obuna kerak ($9.99/oy)"
          : "Audio qo'ng'iroq uchun Premium+ obuna kerak ($9.99/oy). Premium — chat, Premium+ — qo'ng'iroq va AI tarjima.",
        requiresPlan: "premium_plus",
        currentPlan: plan,
      }, { status: 402 });
    }

    if (await userHasActiveCall(session.userId, session.tcallId)) {
      return NextResponse.json({ error: "Siz allaqachon qo'ng'iroqdasiz" }, { status: 409 });
    }

    await endStaleCallsForUser(session.userId, session.tcallId);

    const callee = await prisma.user.findUnique({
      where: { tcallId: targetId },
      select: { id: true, name: true, language: true, tcallId: true, status: true },
    });

    if (!callee) {
      return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });
    }

    const blockedByCallee = await prisma.blockedUser.findFirst({
      where: { blockerId: callee.id, blockedTcallId: session.tcallId! },
    });
    if (blockedByCallee) {
      return NextResponse.json({ error: "Bu raqamga qo'ng'iroq qilib bo'lmaydi" }, { status: 403 });
    }

    const blockedByCaller = await prisma.blockedUser.findFirst({
      where: { blockerId: session.userId, blockedTcallId: targetId },
    });
    if (blockedByCaller) {
      return NextResponse.json({ error: "Bu raqam bloklangan. Avval blokdan chiqaring" }, { status: 403 });
    }

    if (callee.status === "dnd") {
      return NextResponse.json(
        {
          error: "Abonent bezovta qilinmasin rejimida",
          canMessage: true,
          calleeTcallId: targetId,
          callee: { name: callee.name, tcallId: targetId },
        },
        { status: 409 }
      );
    }

    if (callee.status === "busy") {
      return NextResponse.json(
        {
          error: "Abonent band",
          canMessage: true,
          calleeTcallId: targetId,
          callee: { name: callee.name, tcallId: targetId },
        },
        { status: 409 }
      );
    }

    if (await userHasActiveCall(callee.id, callee.tcallId ?? undefined)) {
      return NextResponse.json(
        {
          error: "Abonent band",
          canMessage: true,
          calleeTcallId: targetId,
          callee: { name: callee.name, tcallId: targetId },
        },
        { status: 409 }
      );
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
        callType: "dial",
        status: "ringing",
        participants: { create: { userId: session.userId } },
      },
    });

    const caller = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, language: true, tcallId: true },
    });

    const delivered = emitToUser(callee.id, "incoming-call", {
      roomId: call.roomId,
      callId: call.id,
      caller: {
        userId: session.userId,
        name: caller?.name || session.name,
        language: caller?.language || session.language,
        tcallId: caller?.tcallId || session.tcallId,
      },
    });

    void sendIncomingCallPush(callee.id, {
      roomId: call.roomId,
      callerName: caller?.name || session.name,
      callerTcallId: caller?.tcallId || session.tcallId || "",
    });

    return NextResponse.json({
      roomId: call.roomId,
      callId: call.id,
      calleeOnline: isUserOnline(callee.id),
      delivered,
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
