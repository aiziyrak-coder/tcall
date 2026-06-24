import { prisma } from "./prisma";

export const ACTIVE_STATUSES = ["waiting", "ringing", "active"] as const;
export const RING_TIMEOUT_MS = 45_000;
const MAX_TEXT_LENGTH = 2000;

function ringingCutoff() {
  return new Date(Date.now() - RING_TIMEOUT_MS);
}

export async function endStaleCallsForUser(userId: string, userTcallId?: string | null) {
  const cutoff = ringingCutoff();
  const activeCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);

  await prisma.call.updateMany({
    where: {
      status: "ringing",
      createdAt: { lt: cutoff },
      OR: [
        { hostId: userId },
        ...(userTcallId ? [{ calleeTcallId: userTcallId }] : []),
      ],
    },
    data: { status: "missed", endedAt: new Date() },
  });

  await prisma.call.updateMany({
    where: {
      status: "waiting",
      createdAt: { lt: cutoff },
      hostId: userId,
    },
    data: { status: "cancelled", endedAt: new Date() },
  });

  await prisma.call.updateMany({
    where: { hostId: userId, status: { in: ["ringing", "waiting"] } },
    data: { status: "cancelled", endedAt: new Date() },
  });

  await prisma.call.updateMany({
    where: {
      status: "active",
      createdAt: { lt: activeCutoff },
      OR: [
        { hostId: userId },
        ...(userTcallId ? [{ calleeTcallId: userTcallId }] : []),
      ],
    },
    data: { status: "ended", endedAt: new Date() },
  });
}

export async function userHasActiveCall(userId: string, userTcallId?: string | null): Promise<boolean> {
  const cutoff = ringingCutoff();

  const call = await prisma.call.findFirst({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      OR: [
        { hostId: userId },
        { participants: { some: { userId, leftAt: null } } },
        ...(userTcallId ? [{ calleeTcallId: userTcallId, status: { in: ["ringing", "active"] } }] : []),
      ],
    },
  });

  if (!call) return false;
  if (call.status === "ringing" && call.createdAt < cutoff) return false;
  if (call.status === "waiting" && call.createdAt < cutoff) return false;
  if (call.status === "active" && call.createdAt < new Date(Date.now() - 2 * 60 * 60 * 1000)) return false;
  return true;
}

export async function getCallByRoomId(roomId: string) {
  return prisma.call.findUnique({
    where: { roomId: roomId.toUpperCase() },
    include: {
      host: { select: { id: true, name: true, tcallId: true, language: true } },
      participants: { include: { user: { select: { id: true, tcallId: true } } } },
    },
  });
}

export async function canJoinCall(
  call: NonNullable<Awaited<ReturnType<typeof getCallByRoomId>>>,
  userId: string,
  userTcallId?: string | null
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (["ended", "rejected", "cancelled", "missed"].includes(call.status)) {
    return { ok: false, reason: "Qo'ng'iroq tugagan" };
  }

  const isHost = call.hostId === userId;
  const isParticipant = call.participants.some((p) => p.userId === userId);

  if (call.callType === "dial" && call.calleeTcallId) {
    const isCallee = userTcallId === call.calleeTcallId;
    if (!isHost && !isCallee && !isParticipant) {
      return { ok: false, reason: "Bu qo'ng'iroqqa ruxsat yo'q" };
    }
  }

  const count = call.participants.length;
  if (!isParticipant && count >= 2) {
    return { ok: false, reason: "Qo'ng'iroq band" };
  }

  return { ok: true };
}

export async function markCallEnded(roomId: string, userId: string) {
  const call = await getCallByRoomId(roomId);
  if (!call) return { ok: false as const, reason: "Topilmadi" };

  const isParticipant =
    call.hostId === userId || call.participants.some((p) => p.userId === userId);
  if (!isParticipant) return { ok: false as const, reason: "Ruxsat yo'q" };

  if (["ended", "rejected", "cancelled", "missed"].includes(call.status)) {
    return { ok: true as const, callId: call.id, alreadyEnded: true as const };
  }

  const durationSec = call.createdAt
    ? Math.max(0, Math.floor((Date.now() - call.createdAt.getTime()) / 1000))
    : undefined;

  await prisma.$transaction([
    prisma.call.updateMany({
      where: {
        roomId: roomId.toUpperCase(),
        status: { in: [...ACTIVE_STATUSES] },
      },
      data: { status: "ended", endedAt: new Date(), durationSec },
    }),
    prisma.callParticipant.updateMany({
      where: { callId: call.id, userId, leftAt: null },
      data: { leftAt: new Date() },
    }),
  ]);

  return { ok: true as const, callId: call.id, alreadyEnded: false as const };
}

export async function acceptCall(roomId: string, userId: string, userTcallId?: string | null) {
  const call = await getCallByRoomId(roomId);
  if (!call || !["ringing", "active"].includes(call.status)) {
    return { ok: false as const, reason: "Qo'ng'iroq mavjud emas" };
  }

  if (call.status === "active") {
    const already = call.participants.some((p) => p.userId === userId);
    if (already) return { ok: true as const, hostId: call.hostId };
  }

  if (call.calleeTcallId && userTcallId !== call.calleeTcallId) {
    return { ok: false as const, reason: "Ruxsat yo'q" };
  }

  const already = call.participants.some((p) => p.userId === userId);
  if (!already) {
    await prisma.callParticipant.create({ data: { callId: call.id, userId } });
  }

  const updated = await prisma.call.updateMany({
    where: { id: call.id, status: "ringing" },
    data: { status: "active" },
  });

  if (updated.count === 0) {
    const fresh = await getCallByRoomId(roomId);
    if (fresh?.status === "active") {
      return { ok: true as const, hostId: call.hostId };
    }
    return { ok: false as const, reason: "Qo'ng'iroq allaqachon tugagan" };
  }

  return { ok: true as const, hostId: call.hostId };
}

export async function rejectCall(roomId: string, userId: string, userTcallId?: string | null) {
  const call = await getCallByRoomId(roomId);
  if (!call || call.status !== "ringing") return { ok: false as const };

  if (call.calleeTcallId && userTcallId !== call.calleeTcallId) {
    return { ok: false as const };
  }

  const updated = await prisma.call.updateMany({
    where: { id: call.id, status: "ringing" },
    data: { status: "rejected", endedAt: new Date() },
  });

  if (updated.count === 0) return { ok: false as const };

  return { ok: true as const, hostId: call.hostId };
}

export async function cancelCall(roomId: string, userId: string) {
  const call = await getCallByRoomId(roomId);
  if (!call || call.status !== "ringing") return { ok: false as const };

  if (call.hostId !== userId) return { ok: false as const };

  const updated = await prisma.call.updateMany({
    where: { id: call.id, status: "ringing" },
    data: { status: "cancelled", endedAt: new Date() },
  });

  if (updated.count === 0) return { ok: false as const };

  const callee = call.calleeTcallId
    ? await prisma.user.findUnique({ where: { tcallId: call.calleeTcallId }, select: { id: true } })
    : null;

  return { ok: true as const, calleeId: callee?.id };
}

export async function expireStaleRingingCalls() {
  const cutoff = ringingCutoff();
  const stale = await prisma.call.findMany({
    where: { status: { in: ["ringing", "waiting"] }, createdAt: { lt: cutoff } },
    include: { host: { select: { id: true } } },
  });

  const results: Array<{ roomId: string; hostId: string; calleeId?: string }> = [];

  for (const call of stale) {
    await prisma.call.update({
      where: { id: call.id },
      data: {
        status: call.status === "waiting" ? "cancelled" : "missed",
        endedAt: new Date(),
      },
    });

    let calleeId: string | undefined;
    if (call.calleeTcallId) {
      const callee = await prisma.user.findUnique({
        where: { tcallId: call.calleeTcallId },
        select: { id: true },
      });
      calleeId = callee?.id;
    }

    results.push({ roomId: call.roomId, hostId: call.host.id, calleeId });
  }

  return results;
}

export function clampTranscript(text: string): string {
  return text.trim().slice(0, MAX_TEXT_LENGTH);
}
