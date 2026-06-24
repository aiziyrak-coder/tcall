import { prisma } from "./prisma";
import { translateForChat } from "./openai";
import { emitToUser } from "./socket-io";

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

export async function findOrCreateDirectConversation(userIdA: string, userIdB: string) {
  const existing = await prisma.conversation.findMany({
    where: {
      type: "direct",
      members: { some: { userId: userIdA } },
    },
    include: { members: { select: { userId: true } } },
  });

  const match = existing.find(
    (c) => c.members.length === 2 && c.members.some((m) => m.userId === userIdB)
  );
  if (match) return match.id;

  const conv = await prisma.conversation.create({
    data: {
      type: "direct",
      createdById: userIdA,
      members: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
  });
  return conv.id;
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
        create: uniqueIds.map((userId) => ({ userId })),
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

export async function sendChatMessage(input: SendMessageInput) {
  await assertMember(input.conversationId, input.senderId);

  const members = await prisma.conversationMember.findMany({
    where: { conversationId: input.conversationId },
    include: { user: { select: { id: true, language: true, name: true, tcallId: true } } },
  });

  const sender = members.find((m) => m.userId === input.senderId)?.user;
  if (!sender) throw new Error("FORBIDDEN");

  const originalText = input.text?.trim() || null;
  const msg = await prisma.chatMessage.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      type: input.type || "text",
      originalText,
      sourceLang: input.sourceLang,
      mediaUrl: input.mediaUrl,
      mediaMime: input.mediaMime,
      mediaName: input.mediaName,
      mediaSize: input.mediaSize,
    },
    include: {
      sender: { select: { id: true, name: true, tcallId: true, language: true } },
    },
  });

  const translations: { targetLang: string; text: string }[] = [];

  if (originalText) {
    const targetLangs = new Set(
      members.filter((m) => m.userId !== input.senderId).map((m) => m.user.language)
    );
    targetLangs.add(input.sourceLang);

    for (const targetLang of targetLangs) {
      const text =
        targetLang === input.sourceLang
          ? originalText
          : await translateForChat(originalText, input.sourceLang, targetLang);
      await prisma.messageTranslation.create({
        data: { messageId: msg.id, targetLang, text },
      });
      translations.push({ targetLang, text });
    }
  }

  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  const payload = {
    conversationId: input.conversationId,
    message: formatMessage(msg, translations, input.sourceLang),
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
    message: formatMessageForUser(msg, translations, input.sourceLang),
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
    createdAt: Date;
    sender: { id: string; name: string; tcallId: string | null; language: string };
  },
  translations: { targetLang: string; text: string }[],
  userLang: string
) {
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
    hasTranslation: !!(translation && msg.originalText && translation.text !== msg.originalText),
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
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, tcallId: true, language: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, name: true, tcallId: true, language: true } },
              translations: true,
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  let unreadTotal = 0;

  const conversations = await Promise.all(
    memberships.map(async (m) => {
      const conv = m.conversation;
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
      const title =
        conv.type === "group"
          ? conv.name || "Guruh"
          : otherMembers[0]?.name || otherMembers[0]?.tcallId || "?";

      let lastPreview = "";
      if (lastMsg) {
        const tr = lastMsg.translations.find((t) => t.targetLang === userLang);
        lastPreview = tr?.text ?? lastMsg.originalText ?? "";
        if (lastMsg.type === "image") lastPreview = "📷 " + (lastPreview || "Rasm");
        if (lastMsg.type === "video") lastPreview = "🎬 " + (lastPreview || "Video");
        if (lastMsg.type === "file") lastPreview = "📎 " + (lastMsg.mediaName || "Fayl");
      }

      return {
        id: conv.id,
        type: conv.type,
        title,
        members: conv.members.map((cm) => ({
          userId: cm.user.id,
          name: cm.user.name,
          tcallId: cm.user.tcallId,
          language: cm.user.language,
        })),
        lastMessage: lastMsg
          ? formatMessageForUser(
              { ...lastMsg, sender: lastMsg.sender },
              lastMsg.translations.map((t) => ({ targetLang: t.targetLang, text: t.text })),
              userLang
            )
          : null,
        unreadCount,
        updatedAt: conv.updatedAt.toISOString(),
      };
    })
  );

  return { conversations, unreadTotal };
}

export async function getMessagesForConversation(
  conversationId: string,
  userId: string,
  userLang: string,
  cursor?: string
) {
  await assertMember(conversationId, userId);

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

  return messages.reverse().map((m) =>
    formatMessageForUser(
      m,
      m.translations.map((t) => ({ targetLang: t.targetLang, text: t.text })),
      userLang
    )
  );
}

export async function markConversationRead(conversationId: string, userId: string) {
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
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
