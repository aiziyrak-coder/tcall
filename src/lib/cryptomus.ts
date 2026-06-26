import crypto from "crypto";
import { getPublicApiUrl, getWebAppUrl } from "@/lib/domains";

const API_BASE = "https://api.cryptomus.com/v1";

export type CryptomusPaymentStatus =
  | "wait"
  | "process"
  | "confirm_check"
  | "paid"
  | "paid_over"
  | "finished"
  | "fail"
  | "cancel"
  | "system_fail"
  | "refund_process"
  | "refund_fail"
  | "refund_paid"
  | "locked"
  | "wrong_amount"
  | "wrong_amount_waiting";

export interface CryptomusInvoice {
  uuid: string;
  order_id: string;
  amount: string;
  currency: string;
  url: string;
  address?: string;
  network?: string;
  expired_at: number;
  payment_status: CryptomusPaymentStatus;
  status?: string;
}

/** Cryptomus merchant UUID — .env: MERCHANT_ID yoki CRYPTOMUS_MERCHANT_ID */
export function getCryptomusMerchantId(): string {
  return process.env.MERCHANT_ID || process.env.CRYPTOMUS_MERCHANT_ID || "";
}

/** Cryptomus Payment API key — .env: PAYMENT_API_KEY yoki CRYPTOMUS_API_KEY */
export function getCryptomusApiKey(): string {
  return process.env.PAYMENT_API_KEY || process.env.CRYPTOMUS_API_KEY || "";
}

export function cryptomusConfigured(): boolean {
  return !!getCryptomusMerchantId() && !!getCryptomusApiKey();
}

/** Cryptomus imzosi: MD5(base64(JSON) + apiKey) */
export function cryptomusSign(payload: Record<string, unknown>): string {
  const key = getCryptomusApiKey();
  const json = JSON.stringify(payload).replace(/\//g, "\\/");
  const base64 = Buffer.from(json).toString("base64");
  return crypto.createHash("md5").update(base64 + key).digest("hex");
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
  const s = status.toLowerCase();
  return s === "paid" || s === "paid_over" || s === "finished";
}

export function isCryptomusFailedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "fail" || s === "cancel" || s === "system_fail" || s === "refund_paid";
}

async function cryptomusRequest<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const merchant = getCryptomusMerchantId();
  const key = getCryptomusApiKey();
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
    errors?: Record<string, string[]>;
    result?: T;
  };

  if (!res.ok || data.state !== 0 || !data.result) {
    const errMsg =
      data.message ||
      (data.errors ? JSON.stringify(data.errors) : null) ||
      `Cryptomus xatosi (${res.status})`;
    throw new Error(errMsg);
  }
  return data.result;
}

/** Obuna uchun Cryptomus invoice yaratadi */
export async function createCryptomusInvoice(opts: {
  orderId: string;
  amount: number;
  currency?: string;
  lifetimeSec: number;
  additionalData?: string;
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
    ...(opts.additionalData ? { additional_data: opts.additionalData.slice(0, 255) } : {}),
  });
}

/** Invoice holatini Cryptomus dan so'raydi (webhook kechiksa polling uchun) */
export async function fetchCryptomusPaymentInfo(opts: {
  orderId?: string;
  uuid?: string;
}): Promise<CryptomusInvoice | null> {
  if (!cryptomusConfigured()) return null;
  if (!opts.orderId && !opts.uuid) return null;

  try {
    const payload: Record<string, string> = {};
    if (opts.orderId) payload.order_id = opts.orderId;
    if (opts.uuid) payload.uuid = opts.uuid;
    return await cryptomusRequest<CryptomusInvoice>("/payment/info", payload);
  } catch (e) {
    console.error("Cryptomus payment info error:", e);
    return null;
  }
}
