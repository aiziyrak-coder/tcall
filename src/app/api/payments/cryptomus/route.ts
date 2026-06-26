import { NextRequest, NextResponse } from "next/server";
import { activatePayment } from "@/lib/payments";
import { isCryptomusPaidStatus, verifyCryptomusWebhook } from "@/lib/cryptomus";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!process.env.CRYPTOMUS_API_KEY) {
    return NextResponse.json({ error: "Webhook sozlanmagan" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Noto'g'ri JSON" }, { status: 400 });
  }

  if (!verifyCryptomusWebhook(body)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const orderId = typeof body.order_id === "string" ? body.order_id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const paymentStatus = typeof body.payment_status === "string" ? body.payment_status : status;

  if (!orderId) {
    return NextResponse.json({ ok: true, skipped: "no_order_id" });
  }

  if (!isCryptomusPaidStatus(paymentStatus)) {
    return NextResponse.json({ ok: true, skipped: paymentStatus || "pending" });
  }

  try {
    await activatePayment(orderId, { source: "cryptomus" });
    return NextResponse.json({ ok: true, activated: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ ok: true, skipped: "not_found" });
    }
    console.error("Cryptomus webhook error:", e);
    return NextResponse.json({ error: "Ichki xatolik" }, { status: 500 });
  }
}
