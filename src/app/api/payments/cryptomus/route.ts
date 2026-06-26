import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activatePayment } from "@/lib/payments";
import {
  cryptomusConfigured,
  getCryptomusApiKey,
  isCryptomusFailedStatus,
  isCryptomusPaidStatus,
  verifyCryptomusWebhook,
} from "@/lib/cryptomus";

export const dynamic = "force-dynamic";

/**
 * Cryptomus webhook — to'lov tasdiqlanganda obunani yoqadi.
 * Callback URL: https://api.tcall.uz/api/payments/cryptomus
 */
export async function POST(req: NextRequest) {
  if (!cryptomusConfigured()) {
    return NextResponse.json({ error: "Webhook sozlanmagan" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Noto'g'ri JSON" }, { status: 400 });
  }

  if (!verifyCryptomusWebhook(body)) {
    console.warn("[cryptomus webhook] invalid signature");
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  const uuid = typeof body.uuid === "string" ? body.uuid : "";
  const topStatus = typeof body.status === "string" ? body.status : "";
  const paymentStatus =
    typeof body.payment_status === "string" ? body.payment_status : topStatus;

  if (!orderId) {
    return NextResponse.json({ ok: true, skipped: "no_order_id" });
  }

  if (isCryptomusPaidStatus(paymentStatus) || isCryptomusPaidStatus(topStatus)) {
    try {
      if (uuid) {
        await prisma.payment.updateMany({
          where: { id: orderId, externalId: null },
          data: { externalId: uuid },
        });
      }
      await activatePayment(orderId, { source: "cryptomus" });
      return NextResponse.json({ ok: true, activated: true });
    } catch (e) {
      if (e instanceof Error && e.message === "NOT_FOUND") {
        return NextResponse.json({ ok: true, skipped: "not_found" });
      }
      console.error("Cryptomus webhook activate error:", e);
      return NextResponse.json({ error: "Ichki xatolik" }, { status: 500 });
    }
  }

  if (isCryptomusFailedStatus(paymentStatus) || isCryptomusFailedStatus(topStatus)) {
    await prisma.payment.updateMany({
      where: { id: orderId, status: "pending" },
      data: {
        status: paymentStatus === "cancel" || topStatus === "cancel" ? "expired" : "cancelled",
        note: `cryptomus:${paymentStatus || topStatus}`,
        ...(uuid ? { externalId: uuid } : {}),
      },
    });
    return NextResponse.json({ ok: true, skipped: paymentStatus || topStatus });
  }

  return NextResponse.json({ ok: true, skipped: paymentStatus || topStatus || "pending" });
}

/** Health check — Cryptomus sozlanganligini tekshirish (kalit qiymatini qaytarmaydi) */
export async function GET() {
  return NextResponse.json({
    configured: cryptomusConfigured(),
    hasApiKey: !!getCryptomusApiKey(),
  });
}
