import { prisma } from "./prisma";

/** Faqat o'z yuklagan media URL */
export function isOwnChatMediaUrl(mediaUrl: string, userId: string): boolean {
  if (!mediaUrl || mediaUrl.includes("..")) return false;
  const prefix = `/api/chat/file/${userId}/`;
  return mediaUrl.startsWith(prefix) && mediaUrl.length > prefix.length;
}

/** Chat faylini ko'rish huquqi — egasi yoki suhbat a'zosi */
export async function canAccessChatFile(
  sessionUserId: string,
  fileOwnerId: string,
  filename: string
): Promise<boolean> {
  if (sessionUserId === fileOwnerId) return true;

  const mediaUrl = `/api/chat/file/${fileOwnerId}/${filename}`;
  const message = await prisma.chatMessage.findFirst({
    where: { mediaUrl },
    select: { conversationId: true },
  });
  if (!message) return false;

  const member = await prisma.conversationMember.findFirst({
    where: { conversationId: message.conversationId, userId: sessionUserId },
    select: { id: true },
  });
  return !!member;
}
