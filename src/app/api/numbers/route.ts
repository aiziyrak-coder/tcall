import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tiersForFilter, CATALOG_TIER_FILTERS, type VanityTier } from "@/lib/vanity-pricing";
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
    const tiers = tiersForFilter(tier);
    if (tiers?.length) where.tier = { in: tiers };
  }
  if (q.length >= 2) where.number = { contains: q };

  const [numbers, total, vanityState, tierGroups] = await Promise.all([
    prisma.vanityNumber.findMany({
      where,
      orderBy: [{ price: "asc" }, { number: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, number: true, price: true, tier: true },
    }),
    prisma.vanityNumber.count({ where }),
    getUserVanityState(session.userId),
    prisma.vanityNumber.groupBy({
      by: ["tier"],
      where: { available: true },
      _count: { tier: true },
    }),
  ]);

  const tierCounts: Record<string, number> = { all: 0 };
  for (const row of tierGroups) tierCounts.all += row._count.tier;
  for (const filter of CATALOG_TIER_FILTERS) {
    if (filter === "all") continue;
    const tiers = tiersForFilter(filter) ?? [];
    tierCounts[filter] = tierGroups
      .filter((g) => tiers.includes(g.tier as VanityTier))
      .reduce((sum, g) => sum + g._count.tier, 0);
  }

  return NextResponse.json({
    numbers,
    total,
    page,
    pages: Math.ceil(total / limit),
    tierCounts,
    owned: vanityState.owned,
    pendingRequest: vanityState.pendingRequest,
  });
}
