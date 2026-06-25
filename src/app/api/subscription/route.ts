import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

const purchaseSchema = z.object({
  plan: z.enum(["premium", "premium_plus"]),
  durationDays: z.number().int().min(7).max(365).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const body = purchaseSchema.parse(await req.json());
    const now = new Date();
    const durationDays = body.durationDays ?? 30;

    const existing = await prisma.subscription.findUnique({
      where: { userId: session.userId },
      select: { expiresAt: true, status: true },
    });

    const baseDate =
      existing?.status === "active" && existing.expiresAt && existing.expiresAt > now
        ? existing.expiresAt
        : now;
    const expiresAt = new Date(baseDate.getTime() + durationDays * 86400_000);

    const subscription = await prisma.subscription.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        plan: body.plan,
        status: "active",
        startedAt: now,
        expiresAt,
        price: SUBSCRIPTION_PRICES[body.plan],
        note: "self_checkout",
      },
      update: {
        plan: body.plan,
        status: "active",
        startedAt: now,
        expiresAt,
        price: SUBSCRIPTION_PRICES[body.plan],
        note: "self_checkout",
      },
      select: { plan: true, status: true, expiresAt: true, startedAt: true, price: true },
    });

    return NextResponse.json({
      ok: true,
      plan: subscription.plan,
      subscription,
      prices: SUBSCRIPTION_PRICES,
      features: PLAN_FEATURES,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    console.error("Subscription purchase error:", e);
    return NextResponse.json({ error: "Obuna faollashtirib bo'lmadi" }, { status: 500 });
  }
}
