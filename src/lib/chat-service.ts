import { prisma } from "./prisma";
import {
  backfillTranslationForUser,
  ensureMessageTranslations,
} from "./chat-translate";
import { emitToUser } from "./socket-io";
import { computeMessageReadStatus, type MessageReadStatus } from "./chat-read-status";
import { isUserOnline } from "./socket-io";

import { formatMessagePreview } from "./chat-preview";
import { getUI } from "./languages";

export function makeDirectKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(":");
}

export type ChatMessageType = "text" | "image" | "video" | "file";

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  type?: ChatMessageType;
  text?: string;
  sourceLang: string;
  mediaUrl?: string;
  mediaMime?: string;
  mediaName?: string;
  mediaSize?: number;
}

export async function isBlockedBetween(userIdA: string, tcallIdA: string, userIdB: string, tcallIdB: string) {
  const blocked = await prisma.blockedUser.findFirst({
    where: {
      OR: [
        { blockerId: userIdB, blockedTcallId: tcallIdA },
        { blockerId: userIdA, blockedTcallId: tcallIdB },
      ],
    },
  });
  return !!blocked;
}

export type MemberRole = "owner" | "admin" | "member";

export async function findOrCreateDirectConversation(userIdA: string, userIdB: string) {
  const directKey = makeDirectKey(userIdA, userIdB);

  let conv = await prisma.conversation.findUnique({
    where: { directKey },
    select: { id: true },
  });

  if (!conv) {
    const legacy = await prisma.conversation.findMany({
      where: {
        type: "direct",
        OR: [
          { AND: [{ members: { some: { userId: userIdA } } }, { members: { some: { userId: userIdB } } }] },
          {
            AND: [
              { members: { some: { userId: userIdA } } },
              { messages: { some: { senderId: userIdB } } },
            ],
          },
          {
            AND: [
              { members: { some: { userId: userIdB } } },
              { messages: { some: { senderId: userIdA } } },
            ],
          },
        ],
      },
      select: { id: true, directKey: true },
      take: 1,
    });
    if (legacy[0]) {
      if (!legacy[0].directKey) {
        await prisma.conversation.update({
          where: { id: legacy[0].id },
          data: { directKey },
        });
      }
      conv = { id: legacy[0].id };
    }
  }

  if (conv) {
    for (const uid of [userIdA, userIdB]) {
      await prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: uid } },
        create: { conversationId: conv.id, userId: uid, role: "member" },
        update: { hiddenAt: null },
      });
    }
    return conv.id;
  }

  const created = await prisma.conversation.create({
    data: {
      type: "direct",
      directKey,
      createdById: userIdA,
      members: {
        create: [
          { userId: userIdA, role: "member" },
          { userId: userIdB, role: "member" },
        ],
      },
    },
  });
  return created.id;
}

export async function createGroupConversation(
  creatorId: string,
  name: string,
  memberUserIds: string[]
) {
  const uniqueIds = [...new Set([creatorId, ...memberUserIds])];
  const conv = await prisma.conversation.create({
    data: {
      type: "group",
      name: name.trim().slice(0, 80),
      createdById: creatorId,
      members: {
        create: uniqueIds.map((userId) => ({
          userId,
          role: userId === creatorId ? "owner" : "member",
        })),
      },
    },
  });
  return conv.id;
}

export async function assertMember(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new Error("FORBIDDEN");
  return member;
}

export async function getMemberRole(conversationId: string, userId: string): Promise<MemberRole> {
  const member = await assertMember(conversationId, userId);
  return (member.role as MemberRole) || "member";
}

export async function assertCanManageGroup(conversationId: string, actorId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true, createdById: true },
  });
  if (!conv || conv.type !== "group") throw new Error("NOT_GROUP");
  const role = await getMemberRole(conversationId, actorId);
  if (role !== "owner" && role !== "admin") throw new Error("FORBIDDEN");
  return conv;
}

export async function updateGroupName(conversationId: string, actorId: string, name: string) {
  await assertCanManageGroup(conversationId, actorId);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { name: name.trim().slice(0, 80), updatedAt: new Date() },
  });
}

export async function setMemberRole(
  conversationId: string,
  actorId: string,
  targetUserId: string,
  role: MemberRole
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: true },
  });
  if (!conv || conv.type !== "group") throw new Error("NOT_GROUP");

  const actorRole = await getMemberRole(conversationId, actorId);
  const target = conv.members.find((m) => m.userId === targetUserId);
  if (!target) throw new Error("NOT_FOUND");
  const targetRole = (target.role as MemberRole) || "member";

  if (role === "owner") {
    if (actorRole !== "owner") throw new Error("FORBIDDEN");
    await prisma.$transaction([
      prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: actorId } },
        data: { role: "admin" },
      }),
      prisma.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId: targetUserId } },
        data: { role: "owner" },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { createdById: targetUserId },
      }),
    ]);
    return { role: "owner" as const };
  }

  if (actorRole !== "owner") throw new Error("FORBIDDEN");
  if (targetRole === "owner") throw new Error("FORBIDDEN");
  if (role !== "admin" && role !== "member") throw new Error("INVALID_ROLE");

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
    data: { role },
  });
  return { role };
}

export async function removeMemberFromGroup(
  conversationId: string,
  actorId: string,
  targetUserId: string
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: true },
  });
  if (!conv || conv.type !== "group") throw new Error("NOT_GROUP");

  const actorRole = await getMemberRole(conversationId, actorId);
  const target = conv.members.find((m) => m.userId === targetUserId);
  if (!target) throw new Error("NOT_FOUND");
  const targetRole = (target.role as MemberRole) || "member";

  if (actorId === targetUserId) {
    if (targetRole === "owner") {
      const others = conv.members.filter((m) => m.userId !== actorId);
      if (others.length === 0) {
        await prisma.conversation.delete({ where: { id: conversationId } });
        return { removed: true, purged: true };
      }
      const next =
        others.find((m) => m.role === "admin") ||
        others.find((m) => m.role === "member") ||
        others[0];
      await prisma.$transaction([
        prisma.conversationMember.delete({
          where: { conversationId_userId: { conversationId, userId: actorId } },
        }),
        prisma.conversationMember.update({
          where: { conversationId_userId: { conversationId, userId: next.userId } },
          data: { role: "owner" },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: { createdById: next.userId },
        }),
      ]);
      return { removed: true, newOwnerId: next.userId };
    }
  } else {
    if (actorRole !== "owner" && actorRole !== "admin") throw new Error("FORBIDDEN");
    if (targetRole === "owner") throw new Error("FORBIDDEN");
    if (targetRole === "admin" && actorRole !== "owner") throw new Error("FORBIDDEN");
  }

  await prisma.conversationMember.delete({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
  });

  const remaining = await prisma.conversationMember.count({ where: { conversationId } });
  if (remaining === 0) {
    await prisma.conversation.delete({ where: { id: conversationId } });
    return { removed: true, purged: true };
  }

  return { removed: true };
}

export async function sendChatMessage(input: SendMessageInput) {
  await assertMember(input.conversationId, input.senderId);

  const conv = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    select: { type: true },
  });

  const members = await prisma.conversationMember.findMany({
    where: { conversationId: input.conversationId },
    include: { user: { select: { id: true, language: true, name: true, tcallId: true } } },
  });

  const sender = members.find((m) => m.userId === input.senderId)?.user;
  if (!sender) throw new Error("FORBIDDEN");

  if (conv?.type === "direct" && sender.tcallId) {
    for (const m of members) {
      if (m.userId === input.senderId || !m.user.tcallId) continue;
      const blocked = await isBlockedBetween(
        input.senderId,
        sender.tcallId,
        m.user.id,
        m.user.tcallId
      );
      if (blocked) throw new Error("BLOCKED");
    }
  }

  const originalText = input.text?.trim() || null;
  const sourceLang = sender.language || input.sourceLang || "uz";

  const msg = await prisma.chatMessage.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      type: input.type || "text",
      originalText,
      sourceLang,
      mediaUrl: input.mediaUrl,
      mediaMime: input.mediaMime,
      mediaName: input.mediaName,
      mediaSize: input.mediaSize,
    },
    include: {
      sender: { select: { id: true, name: true, tcallId: true, language: true } },
    },
  });

  let translations: { targetLang: string; text: string }[] = [];

  if (originalText) {
    const targetLangs = new Set(
      members.map((m) => m.user.language).filter(Boolean) as string[]
    );
    targetLangs.add(sourceLang);

    translations = await ensureMessageTranslations(
      msg.id,
      originalText,
      sourceLang,
      targetLangs
    );
  }

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  await prisma.conversationMember.updateMany({
    where: {
      conversationId: input.conversationId,
      userId: { not: input.senderId },
      hiddenAt: { not: null },
    },
    data: { hiddenAt: null },
  });

  const payload = {
    conversationId: input.conversationId,
    message: formatMessage(msg, translations, sourceLang),
  };

  for (const member of members) {
    if (member.userId === input.senderId) continue;
    emitToUser(member.userId, "chat-message", {
      ...payload,
      message: formatMessageForUser(msg, translations, member.user.language),
    });
  }

  emitToUser(input.senderId, "chat-message", {
    ...payload,
    message: {
      ...formatMessageForUser(msg, translations, sourceLang),
      readStatus: "sent" as const,
    },
  });

  return { msg, translations };
}

export function formatMessageForUser(
  msg: {
    id: string;
    type: string;
    originalText: string | null;
    sourceLang: string | null;
    mediaUrl: string | null;
    mediaMime: string | null;
    mediaName: string | null;
    mediaSize: number | null;
    deletedAt?: Date | null;
    createdAt: Date;
    sender: { id: string; name: string; tcallId: string | null; language: string };
  },
  translations: { targetLang: string; text: string }[],
  userLang: string
) {
  if (msg.deletedAt) {
    const ui = getUI(userLang);
    return {
      id: msg.id,
      type: "text" as const,
      originalText: null,
      sourceLang: null,
      displayText: ui.chatMessageDeleted,
      mediaUrl: null,
      mediaMime: null,
      mediaName: null,
      mediaSize: null,
      createdAt: msg.createdAt.toISOString(),
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        tcallId: msg.sender.tcallId,
        language: msg.sender.language,
      },
      hasTranslation: false,
      deleted: true,
      readStatus: undefined as MessageReadStatus | undefined,
    };
  }

  const translation = translations.find((t) => t.targetLang === userLang);
  return {
    id: msg.id,
    type: msg.type,
    originalText: msg.originalText,
    sourceLang: msg.sourceLang,
    displayText: translation?.text ?? msg.originalText,
    mediaUrl: msg.mediaUrl,
    mediaMime: msg.mediaMime,
    mediaName: msg.mediaName,
    mediaSize: msg.mediaSize,
    createdAt: msg.createdAt.toISOString(),
    sender: {
      id: msg.sender.id,
      name: msg.sender.name,
      tcallId: msg.sender.tcallId,
      language: msg.sender.language,
    },
    hasTranslation: !!(
      translation &&
      msg.originalText &&
      msg.sourceLang &&
      msg.sourceLang !== userLang &&
      translation.text.trim() !== (msg.originalText || "").trim()
    ),
    readStatus: undefined as MessageReadStatus | undefined,
  };
}

function formatMessage(
  msg: Parameters<typeof formatMessageForUser>[0],
  translations: { targetLang: string; text: string }[],
  lang: string
) {
  return formatMessageForUser(msg, translations, lang);
}

export async function getConversationsForUser(userId: string, userLang: string) {
  const ui = getUI(userLang);
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, tcallId: true, language: true, avatar: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, name: true, tcallId: true, language: true, avatar: true } },
              translations: true,
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  let unreadTotal = 0;

  const conversations = (
    await Promise.all(
    memberships.map(async (m) => {
      const conv = m.conversation;
      if (m.hiddenAt && conv.updatedAt <= m.hiddenAt) return null;

      const lastMsg = conv.messages[0];
      const lastReadAt = m.lastReadAt ?? new Date(0);

      const unreadCount = await prisma.chatMessage.count({
        where: {
          conversationId: conv.id,
          createdAt: { gt: lastReadAt },
          NOT: { senderId: userId },
        },
      });
      unreadTotal += unreadCount;

      const otherMembers = conv.members.filter((cm) => cm.userId !== userId).map((cm) => cm.user);
      const peerUser = conv.type === "direct" ? otherMembers[0] : null;
      let peerOnline = false;
      let peerLastSeenAt: string | null = null;
      if (peerUser) {
        peerOnline = isUserOnline(peerUser.id);
        const peerRow = await prisma.user.findUnique({
          where: { id: peerUser.id },
          select: { lastSeenAt: true },
        });
        peerLastSeenAt = peerRow?.lastSeenAt?.toISOString() ?? null;
      }

      const title =
        conv.type === "group"
          ? conv.name || ui.chatDefaultGroup
          : otherMembers[0]?.name || otherMembers[0]?.tcallId || "?";

      const lastMessage = lastMsg
        ? formatMessageForUser(
            { ...lastMsg, sender: lastMsg.sender },
            lastMsg.translations.map((t) => ({ targetLang: t.targetLang, text: t.text })),
            userLang
          )
        : null;

      const lastPreview = lastMessage
        ? formatMessagePreview(
            {
              type: lastMsg!.type,
              originalText: lastMsg!.originalText,
              mediaName: lastMsg!.mediaName,
              displayText: lastMessage.displayText,
              deleted: lastMessage.deleted,
            },
            userLang
          )
        : "";

      return {
        id: conv.id,
        type: conv.type,
        title,
        avatar: conv.avatar,
        createdById: conv.createdById,
        members: conv.members.map((cm) => ({
          userId: cm.user.id,
          name: cm.user.name,
          tcallId: cm.user.tcallId,
          language: cm.user.language,
          avatar: cm.user.avatar,
          role: (cm.role as MemberRole) || "member",
        })),
        lastMessage,
        lastPreview,
        unreadCount,
        updatedAt: conv.updatedAt.toISOString(),
        peerOnline,
        peerLastSeenAt,
      };
    })
  )
  ).filter((c): c is NonNullable<typeof c> => c !== null);

  return { conversations, unreadTotal };
}

export async function getMessagesForConversation(
  conversationId: string,
  userId: string,
  userLang: string,
  cursor?: string
) {
  return getMessagesForConversationWithBackfill(conversationId, userId, userLang, cursor);
}

export async function getMessagesForConversationWithBackfill(
  conversationId: string,
  userId: string,
  userLang: string,
  cursor?: string
) {
  await assertMember(conversationId, userId);

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });
  const isDirect = conv?.type === "direct";

  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true, lastReadAt: true },
  });

  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      sender: { select: { id: true, name: true, tcallId: true, language: true } },
      translations: true,
    },
  });

  const hasMore = messages.length === 50;
  const ordered = messages.reverse();
  const formatted = [];

  for (const m of ordered) {
    let translations = m.translations.map((t) => ({
      targetLang: t.targetLang,
      text: t.text,
    }));

    if (m.originalText && m.sourceLang && !m.deletedAt) {
      translations = await backfillTranslationForUser(
        m.id,
        m.originalText,
        m.sourceLang,
        userLang,
        translations
      );
    }

    formatted.push({
      ...formatMessageForUser(m, translations, userLang),
      readStatus: isDirect ? computeMessageReadStatus(m, members, userId) : undefined,
    });
  }

  return { messages: formatted, hasMore };
}

export async function markConversationRead(conversationId: string, userId: string) {
  const readAt = new Date();
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: readAt },
  });

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });

  const others = await prisma.conversationMember.findMany({
    where: { conversationId, NOT: { userId } },
    select: { userId: true },
  });

  const payload = {
    conversationId,
    readerId: userId,
    readAt: readAt.toISOString(),
    conversationType: conv?.type ?? "direct",
  };

  for (const o of others) {
    emitToUser(o.userId, "chat-read", payload);
  }
  emitToUser(userId, "chat-read", payload);

  return readAt;
}

export async function deleteChatMessage(
  conversationId: string,
  messageId: string,
  userId: string
) {
  await assertMember(conversationId, userId);
  const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!msg || msg.conversationId !== conversationId) throw new Error("NOT_FOUND");
  if (msg.senderId !== userId) throw new Error("FORBIDDEN");
  if (msg.deletedAt) return { ok: true };

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
    include: { user: { select: { language: true } } },
  });

  const payload = { conversationId, messageId };
  for (const m of members) {
    emitToUser(m.userId, "chat-message-deleted", payload);
  }

  return { ok: true };
}

export async function leaveConversation(
  conversationId: string,
  userId: string,
  opts?: { purgeGroup?: boolean }
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: { select: { userId: true } } },
  });
  if (!conv) throw new Error("NOT_FOUND");
  await assertMember(conversationId, userId);

  if (conv.type === "group") {
    if (opts?.purgeGroup && conv.createdById === userId) {
      await prisma.conversation.delete({ where: { id: conversationId } });
      return { purged: true as const };
    }
    return removeMemberFromGroup(conversationId, userId, userId);
  }

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { hiddenAt: new Date() },
  });

  return { left: true as const, hidden: true as const };
}

export async function addMembersToGroup(
  conversationId: string,
  actorId: string,
  memberTcallIds: string[]
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true, createdById: true },
  });
  if (!conv || conv.type !== "group") throw new Error("NOT_GROUP");
  await assertCanManageGroup(conversationId, actorId);

  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { tcallId: true },
  });
  if (!actor?.tcallId) throw new Error("FORBIDDEN");

  const uniqueIds = [...new Set(memberTcallIds.map((s) => s.replace(/\D/g, "")).filter((s) => s.length === 9))];
  if (uniqueIds.length === 0) throw new Error("NO_MEMBERS");

  const users = await prisma.user.findMany({
    where: { tcallId: { in: uniqueIds } },
    select: { id: true, tcallId: true },
  });

  const existing = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((m) => m.userId));

  const toAdd: typeof users = [];
  for (const u of users) {
    if (existingIds.has(u.id)) continue;
    if (u.tcallId) {
      const blocked = await isBlockedBetween(actorId, actor.tcallId, u.id, u.tcallId);
      if (blocked) continue;
    }
    toAdd.push(u);
  }

  if (toAdd.length === 0) return { added: 0, skipped: uniqueIds.length - users.length };

  await prisma.conversationMember.createMany({
    data: toAdd.map((u) => ({ conversationId, userId: u.id, role: "member" })),
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return { added: toAdd.length };
}

export async function sendDirectMessage(
  senderId: string,
  senderTcallId: string,
  senderLang: string,
  recipientTcallId: string,
  text: string,
  media?: { url: string; mime: string; name: string; size: number; type: ChatMessageType }
) {
  const recipient = await prisma.user.findUnique({ where: { tcallId: recipientTcallId } });
  if (!recipient) throw new Error("NOT_FOUND");

  const blocked = await isBlockedBetween(senderId, senderTcallId, recipient.id, recipientTcallId);
  if (blocked) throw new Error("BLOCKED");

  const conversationId = await findOrCreateDirectConversation(senderId, recipient.id);
  return sendChatMessage({
    conversationId,
    senderId,
    type: media?.type || "text",
    text: text || undefined,
    sourceLang: senderLang,
    mediaUrl: media?.url,
    mediaMime: media?.mime,
    mediaName: media?.name,
    mediaSize: media?.size,
  });
}
