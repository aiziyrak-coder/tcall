import webpush from "web-push";
import { prisma } from "./prisma";

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@tcall.uz";
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

export function isWebPushConfigured(): boolean {
  return ensureConfigured();
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export interface WebPushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  tag?: string;
  isCall?: boolean;
}

/** Send a web push to all of a user's browser subscriptions. Stale subs are pruned. */
export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<{ sent: number }> {
  if (!ensureConfigured()) return { sent: 0 };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return { sent: 0 };

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    tag: payload.tag,
    isCall: payload.isCall ?? false,
  });

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          {
            urgency: payload.isCall ? "high" : "normal",
            TTL: payload.isCall ? 30 : 600,
          }
        );
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) stale.push(s.endpoint);
      }
    })
  );

  if (stale.length > 0) {
    try {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
    } catch {
      /* ignore */
    }
  }

  return { sent };
}
