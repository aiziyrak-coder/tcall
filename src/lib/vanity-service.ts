import { prisma } from "@/lib/prisma";

export async function isNumberTaken(number: string): Promise<boolean> {
  const [user, vanity, pending] = await Promise.all([
    prisma.user.findUnique({ where: { tcallId: number }, select: { id: true } }),
    prisma.vanityNumber.findFirst({
      where: { number, OR: [{ available: false }, { userId: { not: null } }] },
      select: { id: true },
    }),
    prisma.vanityNumberRequest.findFirst({
      where: { number, status: "pending" },
      select: { id: true },
    }),
  ]);

  return !!(user || vanity || pending);
}

export async function getUserVanityState(userId: string) {
  const [owned, pendingRequest] = await Promise.all([
    prisma.vanityNumber.findUnique({
      where: { userId },
      select: { number: true, tier: true, purchasedAt: true },
    }),
    prisma.vanityNumberRequest.findFirst({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        number: true,
        price: true,
        tier: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return { owned, pendingRequest };
}
