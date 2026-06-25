import { prisma } from "./prisma";
import { emitToUser, isUserOnline } from "./socket-io";

export interface PresencePayload {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
}

export async function updateUserLastSeen(userId: string): Promise<Date> {
  const at = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: at },
  });
  return at;
}

export async function getChatPartnerIds(userId: string): Promise<Set<string>> {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  const partnerIds = new Set<string>();
  for (const m of memberships) {
    const others = await prisma.conversationMember.findMany({
      where: { conversationId: m.conversationId, NOT: { userId } },
      select: { userId: true },
    });
    for (const o of others) partnerIds.add(o.userId);
  }
  return partnerIds;
}

export async function broadcastUserPresence(userId: string, online: boolean) {
  let lastSeenAt: Date | null = null;
  if (!online) {
    lastSeenAt = await updateUserLastSeen(userId);
  }

  const partners = await getChatPartnerIds(userId);
  const payload: PresencePayload = {
    userId,
    online,
    lastSeenAt: lastSeenAt?.toISOString() ?? null,
  };

  for (const partnerId of partners) {
    emitToUser(partnerId, "user-presence", payload);
  }
}

export async function getDirectPeerPresence(conversationId: string, viewerId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: { select: { userId: true } } },
  });
  if (!conv || conv.type !== "direct") return null;

  const peerId = conv.members.find((m) => m.userId !== viewerId)?.userId;
  if (!peerId) return null;

  const user = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, lastSeenAt: true },
  });
  if (!user) return null;

  return {
    userId: user.id,
    online: isUserOnline(user.id),
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
  };
}

export async function getUserPresence(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, lastSeenAt: true },
  });
  if (!user) return null;
  return {
    userId: user.id,
    online: isUserOnline(user.id),
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
  };
}
