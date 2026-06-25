/**
 * Firebase Cloud Messaging — HTTP v1 (zamonaviy API).
 * Sozlash: FCM_SERVICE_ACCOUNT env ga Firebase service account JSON (yoki base64).
 * (Eski "legacy" FCM API Google tomonidan o'chirilgan — bu v1 ishlatadi.)
 */
import { SignJWT, importPKCS8 } from "jose";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedSa: ServiceAccount | null | undefined;

function getServiceAccount(): ServiceAccount | null {
  if (cachedSa !== undefined) return cachedSa;
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) {
    cachedSa = null;
    return null;
  }
  const tryParse = (s: string): ServiceAccount | null => {
    try {
      const o = JSON.parse(s);
      if (o.project_id && o.client_email && o.private_key) {
        return { project_id: o.project_id, client_email: o.client_email, private_key: String(o.private_key).replace(/\\n/g, "\n") };
      }
    } catch {
      /* ignore */
    }
    return null;
  };
  cachedSa = tryParse(raw) || tryParse(Buffer.from(raw, "base64").toString("utf8")) || null;
  if (!cachedSa) console.warn("[fcm] FCM_SERVICE_ACCOUNT noto'g'ri formatda");
  return cachedSa;
}

export function fcmConfigured(): boolean {
  return !!getServiceAccount();
}

let tokenCache: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  try {
    const now = Math.floor(Date.now() / 1000);
    const key = await importPKCS8(sa.private_key, "RS256");
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(sa.client_email)
      .setSubject(sa.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn("[fcm] token olishda xato:", res.status);
      return null;
    }
    const j = await res.json();
    tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    return tokenCache.token;
  } catch (e) {
    console.error("[fcm] access token error:", e);
    return null;
  }
}

export interface FcmMessage {
  title: string;
  body: string;
  data: Record<string, string>;
  channelId?: string;
  isCall?: boolean;
}

export async function sendFcmV1(
  token: string,
  msg: FcmMessage
): Promise<"sent" | "invalid_token" | "error"> {
  const sa = getServiceAccount();
  if (!sa) return "error";
  const access = await getAccessToken(sa);
  if (!access) return "error";

  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: msg.title, body: msg.body },
          data: msg.data,
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: msg.channelId || (msg.isCall ? "calls" : "default"),
              ...(msg.isCall ? { notification_priority: "PRIORITY_MAX", visibility: "PUBLIC" } : {}),
            },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: { aps: { sound: "default", "interruption-level": msg.isCall ? "time-sensitive" : "active" } },
          },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) return "sent";
    const text = await res.text().catch(() => "");
    if (res.status === 404 || /UNREGISTERED|NOT_FOUND|InvalidRegistration/i.test(text)) {
      return "invalid_token";
    }
    console.warn("[fcm] v1 send failed:", res.status, text.slice(0, 200));
    return "error";
  } catch (e) {
    console.error("[fcm] v1 send error:", e);
    return "error";
  }
}
