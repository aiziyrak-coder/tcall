import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedVanityNumbers } from "@/lib/tcallId";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  await seedVanityNumbers();

  const numbers = await prisma.vanityNumber.findMany({
    where: { available: true },
    orderBy: [{ tier: "asc" }, { price: "asc" }],
    select: { id: true, number: true, price: true, tier: true },
  });

  const owned = await prisma.vanityNumber.findUnique({
    where: { userId: session.userId },
    select: { number: true, tier: true, purchasedAt: true },
  });

  return NextResponse.json({ numbers, owned });
}
