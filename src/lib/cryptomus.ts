import crypto from "crypto";
import { getPublicApiUrl, getWebAppUrl } from "@/lib/domains";

const API_BASE = "https://api.cryptomus.com/v1";

export type CryptomusPaymentStatus =
  | "wait"
  | "process"
  | "confirm_check"
  | "paid"
  | "paid_over"
  | "fail"
  | "cancel"
  | "system_fail"
  | "refund_process"
  | "refund_fail"
  | "refund_paid"
  | "locked";

export interface CryptomusInvoice {
  uuid: string;
  order_id: string;
  amount: string;
  currency: string;
  url: string;
  expired_at: number;
  payment_status: CryptomusPaymentStatus;
}

function merchantId(): string {
  return process.env.CRYPTOMUS_MERCHANT_ID || "";
}

function apiKey(): string {
  return process.env.CRYPTOMUS_API_KEY || "";
}

export function cryptomusConfigured(): boolean {
  return !!merchantId() && !!apiKey();
}

/** Cryptomus imzosi: MD5(base64(JSON) + apiKey) */
export function cryptomusSign(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload).replace(/\//g, "\\/");
  const base64 = Buffer.from(json).toString("base64");
  return crypto.createHash("md5").update(base64 + apiKey()).digest("hex");
}

/** Webhook imzosini tekshiradi (sign maydoni olib tashlangan holda) */
export function verifyCryptomusWebhook(body: Record<string, unknown>): boolean {
  const received = body.sign;
  if (typeof received !== "string" || !received) return false;
  const copy = { ...body };
  delete copy.sign;
  return cryptomusSign(copy) === received;
}

export function isCryptomusPaidStatus(status: string): boolean {
  return status === "paid" || status === "paid_over";
}

async function cryptomusRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const merchant = merchantId();
  const key = apiKey();
  if (!merchant || !key) throw new Error("Cryptomus sozlanmagan");

  const sign = cryptomusSign(payload);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      merchant,
      sign,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    state?: number;
    message?: string;
    result?: T;
  };

  if (!res.ok || data.state !== 0 || !data.result) {
    throw new Error(data.message || `Cryptomus xatosi (${res.status})`);
  }
  return data.result;
}

export async function createCryptomusInvoice(opts: {
  orderId: string;
  amount: number;
  currency?: string;
  lifetimeSec: number;
}): Promise<CryptomusInvoice> {
  const apiUrl = getPublicApiUrl();
  const webUrl = getWebAppUrl();
  const lifetime = Math.min(43200, Math.max(300, opts.lifetimeSec));

  return cryptomusRequest<CryptomusInvoice>("/payment", {
    amount: String(opts.amount),
    currency: opts.currency || "UZS",
    order_id: opts.orderId,
    url_callback: `${apiUrl}/api/payments/cryptomus`,
    url_return: webUrl,
    url_success: webUrl,
    lifetime,
    is_payment_multiple: false,
  });
}
