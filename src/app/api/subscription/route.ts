import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, SUBSCRIPTION_PRICES, PLAN_FEATURES } from "@/lib/subscription";
import {
  SUBSCRIPTION_PRICES_UZS,
  PAYMENT_WINDOW_MIN,
  createPendingPayment,
  getPaymentCard,
  paymentConfigured,
  expireOldPayments,
} from "@/lib/payments";

function paymentView(p: {
  id: string; plan: string; amount: number; baseAmount: number; currency: string;
  status: string; expiresAt: Date; createdAt: Date;
} | null) {
  if (!p) return null;
  return {
    id: p.id,
    plan: p.plan,
    amount: p.amount,
    baseAmount: p.baseAmount,
    currency: p.currency,
    status: p.status,
    expiresAt: p.expiresAt,
    createdAt: p.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  await expireOldPayments();

  const [plan, sub, pending] = await Promise.all([
    getUserPlan(session.userId),
    prisma.subscription.findUnique({
      where: { userId: session.userId },
      select: { plan: true, status: true, expiresAt: true, startedAt: true, price: true },
    }),
    prisma.payment.findFirst({
      where: { userId: session.userId, status: "pending", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    plan,
    subscription: sub,
    prices: SUBSCRIPTION_PRICES,
    pricesUzs: SUBSCRIPTION_PRICES_UZS,
    features: PLAN_FEATURES,
    pendingPayment: paymentView(pending),
    card: getPaymentCard(),
    paymentConfigured: paymentConfigured(),
    windowMin: PAYMENT_WINDOW_MIN,
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
    const payment = await createPendingPayment(session.userId, body.plan, body.durationDays ?? 30);

    return NextResponse.json({
      ok: true,
      payment: paymentView(payment),
      card: getPaymentCard(),
      paymentConfigured: paymentConfigured(),
      windowMin: PAYMENT_WINDOW_MIN,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    console.error("Subscription payment error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Xatolik" }, { status: 500 });
  }
}
