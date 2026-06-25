import { prisma } from "@/lib/prisma";

/** Test/mock foydalanuvchilar domenlari (smoke/socket testlardan) */
const TEST_DOMAINS = ["test.local", "example.com"];

export function testUserWhere() {
  return { OR: TEST_DOMAINS.map((d) => ({ email: { endsWith: `@${d}` } })) };
}

export async function countTestUsers(): Promise<number> {
  return prisma.user.count({ where: testUserWhere() });
}

export async function listTestUsers(limit = 500) {
  return prisma.user.findMany({
    where: testUserWhere(),
    select: { id: true, email: true, name: true, tcallId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

/**
 * Foydalanuvchilarni xavfsiz o'chirish — cascade bo'lmagan FK bog'lanishlarni
 * (createdConversations, sentMessages, hostedCalls, participations, quickMessages,
 * vanityNumber) avval tozalaymiz, keyin foydalanuvchini o'chiramiz.
 */
export async function purgeUsersByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  await prisma.$transaction([
    // Yaratgan suhbatlari (a'zolar + xabarlar cascade bilan o'chadi)
    prisma.conversation.deleteMany({ where: { createdById: { in: ids } } }),
    // Boshqa suhbatlardagi yuborgan xabarlari
    prisma.chatMessage.deleteMany({ where: { senderId: { in: ids } } }),
    // Boshqa qo'ng'iroqlardagi ishtiroki
    prisma.callParticipant.deleteMany({ where: { userId: { in: ids } } }),
    // O'zi host qilgan qo'ng'iroqlar (ishtirokchilar + transkriptlar cascade)
    prisma.call.deleteMany({ where: { hostId: { in: ids } } }),
    // Tezkor xabarlar
    prisma.quickMessage.deleteMany({ where: { senderId: { in: ids } } }),
    // Egalik qilgan chiroyli raqamni bo'shatamiz
    prisma.vanityNumber.updateMany({
      where: { userId: { in: ids } },
      data: { userId: null, available: true, purchasedAt: null },
    }),
    // Nihoyat — foydalanuvchilar (qolgan bog'lanishlar cascade bilan o'chadi)
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);

  return ids.length;
}

export async function purgeTestUsers(): Promise<{ deleted: number }> {
  const users = await prisma.user.findMany({
    where: testUserWhere(),
    select: { id: true },
  });
  const deleted = await purgeUsersByIds(users.map((u) => u.id));
  return { deleted };
}
