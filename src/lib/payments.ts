import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_PRICES } from "@/lib/subscription";
import { notifyAdminTelegram } from "@/lib/telegram";

function fmtSom(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

async function notifyAdminNewPayment(userId: string, plan: string, amount: number) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, tcallId: true } }).catch(() => null);
  void notifyAdminTelegram(
    `💳 <b>Yangi to'lov boshlandi</b>\n👤 ${u?.name || "Foydalanuvchi"} (${u?.tcallId || "—"})\nTarif: ${plan}\nSumma: <b>${fmtSom(amount)} so'm</b>`
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

/** Noyob summa uchun qo'shimcha so'm oralig'i (1..MAX_OFFSET) */
const MAX_OFFSET = 499;

export function getPaymentCard() {
  return {
    number: process.env.PAYMENT_CARD_NUMBER || "",
    holder: process.env.PAYMENT_CARD_HOLDER || "",
    bank: process.env.PAYMENT_CARD_BANK || "",
  };
}

/** To'lov karta sozlangan bo'lsa true */
export function paymentConfigured(): boolean {
  return !!process.env.PAYMENT_CARD_NUMBER;
}

/** Muddati o'tgan kutilayotgan to'lovlarni yopadi */
export async function expireOldPayments(): Promise<void> {
  await prisma.payment.updateMany({
    where: { status: "pending", expiresAt: { lt: new Date() } },
    data: { status: "expired" },
  });
}

/** Foydalanuvchi uchun kutilayotgan to'lov yaratadi (noyob summa bilan) */
export async function createPendingPayment(
  userId: string,
  plan: PaidPlan,
  durationDays = 30
) {
  await expireOldPayments();

  const now = new Date();

  // Mavjud, hali muddati o'tmagan kutilayotgan to'lov bo'lsa — o'shani qaytaramiz
  const existing = await prisma.payment.findFirst({
    where: { userId, status: "pending", expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.plan === plan) return existing;
  // Boshqa plan tanlangan bo'lsa, eskisini bekor qilamiz
  if (existing) {
    await prisma.payment.update({ where: { id: existing.id }, data: { status: "cancelled" } });
  }

  const base = SUBSCRIPTION_PRICES_UZS[plan];
  const expiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MIN * 60_000);

  for (let attempt = 0; attempt < 60; attempt++) {
    const offset = 1 + Math.floor(Math.random() * MAX_OFFSET);
    const amount = base + offset;
    const clash = await prisma.payment.findFirst({
      where: { amount, status: "pending", expiresAt: { gt: now } },
      select: { id: true },
    });
    if (!clash) {
      const created = await prisma.payment.create({
        data: {
          userId,
          plan,
          baseAmount: base,
          amount,
          durationDays,
          expiresAt,
          currency: "UZS",
          provider: "p2p_card",
        },
      });
      void notifyAdminNewPayment(userId, plan, amount);
      return created;
    }
  }
  throw new Error("Noyob summa topilmadi — keyinroq urinib ko'ring");
}

/** Bitta raqam matnini so'mga aylantiradi (oxirgi .00 tiyinni tashlab) */
function parseAmountToken(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/[.,]\d{2}$/, "") // oxirgi tiyin (.00 / ,00)
    .replace(/[.,]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 1000 && n <= 1_000_000_000 ? n : null;
}

/**
 * SMS matnidan TO'LOV summasini (Miqdor/Summa) ajratadi.
 * "Qoldiq/Balans" (balans) va karta maskasi (***5696), sana/vaqt e'tiborga olinmaydi.
 */
export function parseIncomingSms(text: string): {
  amount: number | null;
  isIncoming: boolean;
  isOutgoing: boolean;
} {
  // Apostrof variantlarini olib tashlab normallashtiramiz (o'tkazma -> otkazma)
  const norm = text.toLowerCase().replace(/['`’ʻ‘]/g, "");

  // Chiqim (kartadan) — bu holatda obuna yoqilmasligi kerak
  const outgoingHints = [
    "kartadan otkazma", "spisan", "списан", "оплата", "tolov amalga", "pokupka",
    "покупка", "yechib", "снят", "charge", "purchase", "debit",
  ];
  // Kirim (kartaga)
  const incomingHints = [
    "kartaga otkazma", "otkazma", "pul tushdi", "kirim", "popolnen", "пополн",
    "приход", "zachisl", "зачисл", "tushdi", "kelib tushdi", "credit",
  ];

  const isOutgoing = outgoingHints.some((h) => norm.includes(h));
  const isIncoming = !isOutgoing && incomingHints.some((h) => norm.includes(h));

  // Balans qismini kesib tashlaymiz (Qoldiq/Balans/Остаток/Balance dan keyingisi)
  let amountText = text;
  const balanceIdx = amountText.search(/(qoldiq|qoldi|balans|balance|остаток|доступно|mavjud)/i);
  if (balanceIdx >= 0) amountText = amountText.slice(0, balanceIdx);

  // 1) "Miqdor / Summa / Сумма / Amount" yorlig'idan keyingi summani afzal ko'ramiz
  let amount: number | null = null;
  const labeled = amountText.match(/(?:miqdor|miqdori|summa|сумма|сумму|amount|to['`’ʻ]?lov)[^\d]{0,12}([\d][\d\s.,]*\d|\d+)/i);
  if (labeled) amount = parseAmountToken(labeled[1]);

  // 2) Yorliq topilmasa — karta maskasi, sana, vaqtni olib tashlab eng katta summani olamiz
  if (amount == null) {
    const cleanedText = amountText
      .replace(/\*+\s*\d+/g, " ") // ***5696
      .replace(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/g, " ") // 24.06.26
      .replace(/\d{1,2}:\d{2}/g, " "); // 15:45
    const candidates: number[] = [];
    for (const m of cleanedText.matchAll(/(\d[\d\s.,]{2,}\d|\d{4,})/g)) {
      const n = parseAmountToken(m[1]);
      if (n != null) candidates.push(n);
    }
    amount = candidates.length ? Math.max(...candidates) : null;
  }

  return { amount, isIncoming, isOutgoing };
}

/** Tushgan summani kutilayotgan to'lovga moslab obunani yoqadi */
export async function matchAndActivate(
  amount: number,
  rawSms: string
): Promise<{ matched: boolean; paymentId?: string; userId?: string; plan?: string }> {
  await expireOldPayments();
  const now = new Date();
  const payment = await prisma.payment.findFirst({
    where: { amount, status: "pending", expiresAt: { gt: now } },
    orderBy: { createdAt: "asc" },
  });
  if (!payment) return { matched: false };

  await activatePayment(payment.id, { rawSms, source: "sms" });
  return { matched: true, paymentId: payment.id, userId: payment.userId, plan: payment.plan };
}

/** To'lovni "paid" qiladi va obunani yoqadi (idempotent) */
export async function activatePayment(
  paymentId: string,
  opts: { rawSms?: string; approvedBy?: string; source: "sms" | "admin" }
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

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        matchedAt: now,
        rawSms: opts.rawSms ?? payment.rawSms,
        approvedBy: opts.approvedBy,
        note: opts.source === "admin" ? "admin tasdiqladi" : "SMS avtomatik",
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
        note: "p2p_payment",
      },
      update: { plan, status: "active", startedAt: now, expiresAt, price: usdPrice, note: "p2p_payment" },
    }),
  ]);

  const u = await prisma.user.findUnique({ where: { id: payment.userId }, select: { name: true, tcallId: true } }).catch(() => null);
  void notifyAdminTelegram(
    `✅ <b>To'lov tasdiqlandi</b> (${opts.source === "admin" ? "admin" : "SMS"})\n👤 ${u?.name || "Foydalanuvchi"} (${u?.tcallId || "—"})\nTarif: ${plan}\nSumma: <b>${fmtSom(payment.amount)} so'm</b>`
  );

  return prisma.payment.findUnique({ where: { id: payment.id } });
}
