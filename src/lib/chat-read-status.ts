type MemberRead = { userId: string; lastReadAt: Date | null };

export type MessageReadStatus = "sent" | "read";

export function computeMessageReadStatus(
  msg: { senderId: string; createdAt: Date },
  members: MemberRead[],
  viewerId: string
): MessageReadStatus | undefined {
  if (msg.senderId !== viewerId) return undefined;

  const others = members.filter((m) => m.userId !== msg.senderId);
  if (others.length === 0) return "sent";

  const allRead = others.every(
    (m) => (m.lastReadAt ?? new Date(0)).getTime() >= msg.createdAt.getTime()
  );
  return allRead ? "read" : "sent";
}

export function applyReadStatusAfterPeerRead<T extends {
  id: string;
  createdAt: string;
  sender: { id: string };
  readStatus?: MessageReadStatus;
}>(
  messages: T[],
  readerId: string,
  readAtIso: string,
  viewerId: string,
  conversationType?: string
): T[] {
  if (conversationType && conversationType !== "direct") return messages;

  const readAt = new Date(readAtIso).getTime();
  if (readerId === viewerId) return messages;

  return messages.map((m) => {
    if (m.sender.id !== viewerId) return m;
    if (new Date(m.createdAt).getTime() > readAt) return m;
    return { ...m, readStatus: "read" as const };
  });
}
