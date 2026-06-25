import { NextRequest, NextResponse } from "next/server";
import { parseIncomingSms, matchAndActivate } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** SMS-forwarder webhook payloadidan matn va maxfiy tokenni ajratish */
async function extract(req: NextRequest): Promise<{ text: string; secret: string | null }> {
  const url = new URL(req.url);
  const headerSecret =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;
  const querySecret = url.searchParams.get("secret") || url.searchParams.get("token");

  const contentType = req.headers.get("content-type") || "";
  let text = "";
  let bodySecret: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const b = body as Record<string, unknown>;
    text = String(b.text ?? b.message ?? b.msg ?? b.content ?? b.body ?? b.sms ?? "");
    bodySecret = (b.secret as string) ?? (b.token as string) ?? null;
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (form) {
      text = String(form.get("text") || form.get("message") || form.get("msg") || form.get("content") || form.get("body") || form.get("sms") || "");
      bodySecret = (form.get("secret") as string) || (form.get("token") as string) || null;
    }
  } else {
    text = (await req.text().catch(() => "")) || "";
  }

  return { text, secret: headerSecret || querySecret || bodySecret };
}

export async function POST(req: NextRequest) {
  const expected = process.env.PAYMENT_SMS_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "Webhook sozlanmagan" }, { status: 503 });
  }

  const limited = rateLimit(`sms-webhook:${clientIp(req)}`, 120, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "rate_limit" }, { status: 429 });

  const { text, secret } = await extract(req);
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  if (!text.trim()) {
    return NextResponse.json({ ok: true, matched: false, reason: "empty" });
  }

  const { amount, isOutgoing } = parseIncomingSms(text);
  if (isOutgoing) {
    return NextResponse.json({ ok: true, matched: false, reason: "outgoing" });
  }
  if (!amount) {
    return NextResponse.json({ ok: true, matched: false, reason: "no_amount" });
  }

  const result = await matchAndActivate(amount, text.slice(0, 1000));
  return NextResponse.json({ ok: true, ...result, amount });
}
