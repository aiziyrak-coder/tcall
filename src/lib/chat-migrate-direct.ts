import { prisma } from "./prisma";
import { makeDirectKey } from "./chat-service";

export async function migrateDirectConversationKeys() {
  const directs = await prisma.conversation.findMany({
    where: { type: "direct", directKey: null },
    include: { members: { select: { userId: true } } },
  });

  for (const conv of directs) {
    const ids = [...new Set(conv.members.map((m) => m.userId))];
    if (ids.length < 2) continue;

    const directKey = makeDirectKey(ids[0], ids[1]);
    const existing = await prisma.conversation.findUnique({ where: { directKey } });
    if (existing && existing.id !== conv.id) continue;

    try {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { directKey },
      });
    } catch {
      // duplicate key — skip
    }
  }
}
