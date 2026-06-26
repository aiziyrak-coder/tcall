import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PRICES } from "@/lib/subscription";
import { notifyAdminTelegram } from "@/lib/telegram";
import { createCryptomusInvoice, cryptomusConfigured } from "@/lib/cryptomus";

function fmtSom(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

async function notifyAdminNewPayment(userId: string, plan: string, amount: number) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, tcallId: true } }).catch(() => null);
  void notifyAdminTelegram(
    `💳 <b>Yangi to'lov (Cryptomus)</b>\n👤 ${u?.name || "Foydalanuvchi"} (${u?.tcallId || "—"})\nTarif: ${plan}\nSumma: <b>${fmtSom(amount)} so'm</b>`
  );
}

export type PaidPlan = "premium" | "premium_plus";

/** UZS narxlar — env orqali o'zgartirilishi mumkin */
export const SUBSCRIPTION_PRICES_UZS: Record<PaidPlan, number> = {
  premium: Number(process.env.PREMIUM_PRICE_UZS) || 60_000,
  premium_plus: Number(process.env.PREMIUM_PLUS_PRICE_UZS) || 120_000,
};

/** To'lovni kutish oynasi (daqiqa) */
export const PAYMENT_WINDOW_MIN = Number(process.env.PAYMENT_WINDOW_MIN) || 60;

/** Cryptomus sozlangan bo'lsa true */
export function paymentConfigured(): boolean {
  return cryptomusConfigured();
}

/** Muddati o'tgan kutilayotgan to'lovlarni yopadi */
export async function expireOldPayments(): Promise<void> {
  await prisma.payment.updateMany({
    where: { status: "pending", expiresAt: { lt: new Date() } },
    data: { status: "expired" },
  });
}

/** Cryptomus orqali kutilayotgan to'lov yaratadi */
export async function createPendingPayment(
  userId: string,
  plan: PaidPlan,
  durationDays = 30
) {
  if (!paymentConfigured()) throw new Error("To'lov tizimi sozlanmagan");

  await expireOldPayments();

  const now = new Date();
  const existing = await prisma.payment.findFirst({
    where: { userId, status: "pending", expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.plan === plan && existing.paymentUrl) return existing;
  if (existing) {
    await prisma.payment.update({ where: { id: existing.id }, data: { status: "cancelled" } });
  }

  const base = SUBSCRIPTION_PRICES_UZS[plan];
  const expiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MIN * 60_000);
  const lifetimeSec = PAYMENT_WINDOW_MIN * 60;

  const created = await prisma.payment.create({
    data: {
      userId,
      plan,
      baseAmount: base,
      amount: base,
      durationDays,
      expiresAt,
      currency: "UZS",
      provider: "cryptomus",
    },
  });

  try {
    const invoice = await createCryptomusInvoice({
      orderId: created.id,
      amount: base,
      currency: "UZS",
      lifetimeSec,
    });

    const invoiceExpires = invoice.expired_at
      ? new Date(invoice.expired_at * 1000)
      : expiresAt;

    const updated = await prisma.payment.update({
      where: { id: created.id },
      data: {
        externalId: invoice.uuid,
        paymentUrl: invoice.url,
        expiresAt: invoiceExpires,
      },
    });

    void notifyAdminNewPayment(userId, plan, base);
    return updated;
  } catch (e) {
    await prisma.payment.update({
      where: { id: created.id },
      data: { status: "cancelled", note: e instanceof Error ? e.message : "Cryptomus xatosi" },
    });
    throw e;
  }
}

/** To'lovni "paid" qiladi va obunani yoqadi (idempotent) */
export async function activatePayment(
  paymentId: string,
  opts: { approvedBy?: string; source: "cryptomus" | "admin" }
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("NOT_FOUND");
  if (payment.status === "paid") return payment;

  const plan = payment.plan as PaidPlan;
  const now = new Date();
  const existing = await prisma.subscription.findUnique({
    where: { userId: payment.userId },
    select: { expiresAt: true, status: true },
  });
  const baseDate =
    existing?.status === "active" && existing.expiresAt && existing.expiresAt > now
      ? existing.expiresAt
      : now;
  const expiresAt = new Date(baseDate.getTime() + payment.durationDays * 86400_000);
  const usdPrice = SUBSCRIPTION_PRICES[plan] ?? 0;

  const sourceLabel =
    opts.source === "admin" ? "admin tasdiqladi" : "Cryptomus avtomatik";

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        matchedAt: now,
        approvedBy: opts.approvedBy,
        note: sourceLabel,
      },
    }),
    prisma.subscription.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        plan,
        status: "active",
        startedAt: now,
        expiresAt,
        price: usdPrice,
        note: "cryptomus_payment",
      },
      update: { plan, status: "active", startedAt: now, expiresAt, price: usdPrice, note: "cryptomus_payment" },
    }),
  ]);

  const u = await prisma.user.findUnique({ where: { id: payment.userId }, select: { name: true, tcallId: true } }).catch(() => null);
  void notifyAdminTelegram(
    `✅ <b>To'lov tasdiqlandi</b> (${opts.source === "admin" ? "admin" : "Cryptomus"})\n👤 ${u?.name || "Foydalanuvchi"} (${u?.tcallId || "—"})\nTarif: ${plan}\nSumma: <b>${fmtSom(payment.amount)} so'm</b>`
  );

  return prisma.payment.findUnique({ where: { id: payment.id } });
}
