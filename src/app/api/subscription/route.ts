import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, SUBSCRIPTION_PRICES, PLAN_FEATURES } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const [plan, sub] = await Promise.all([
    getUserPlan(session.userId),
    prisma.subscription.findUnique({
      where: { userId: session.userId },
      select: { plan: true, status: true, expiresAt: true, startedAt: true, price: true },
    }),
  ]);

  return NextResponse.json({
    plan,
    subscription: sub,
    prices: SUBSCRIPTION_PRICES,
    features: PLAN_FEATURES,
  });
}
