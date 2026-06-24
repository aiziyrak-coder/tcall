import { prisma } from "./prisma";

/** Mavjud guruh a'zolariga owner rolini berish (bir martalik migratsiya) */
export async function migrateChatMemberRoles() {
  const groups = await prisma.conversation.findMany({
    where: { type: "group" },
    select: { id: true, createdById: true },
  });

  for (const g of groups) {
    await prisma.conversationMember.updateMany({
      where: { conversationId: g.id, userId: g.createdById },
      data: { role: "owner" },
    });
  }
}
