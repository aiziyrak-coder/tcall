import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserVanityState } from "@/lib/vanity-service";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier");
  const q = searchParams.get("q")?.replace(/\D/g, "") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(80, Math.max(20, Number(searchParams.get("limit") || 50)));

  const where: Prisma.VanityNumberWhereInput = { available: true };

  if (tier && tier !== "all") {
    where.tier = { startsWith: tier };
  }
  if (q.length >= 2) where.number = { contains: q };

  const [numbers, total, vanityState] = await Promise.all([
    prisma.vanityNumber.findMany({
      where,
      orderBy: [{ tier: "asc" }, { price: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, number: true, price: true, tier: true },
    }),
    prisma.vanityNumber.count({ where }),
    getUserVanityState(session.userId),
  ]);

  return NextResponse.json({
    numbers,
    total,
    page,
    pages: Math.ceil(total / limit),
    owned: vanityState.owned,
    pendingRequest: vanityState.pendingRequest,
  });
}
