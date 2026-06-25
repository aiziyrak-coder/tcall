import { prisma } from "./prisma";

export interface IncomingCallPush {
  roomId: string;
  callerName: string;
  callerTcallId: string;
}

async function sendFcm(
  token: string,
  payload: {
    title: string;
    body: string;
    data: Record<string, string>;
    priority?: "high" | "normal";
  }
) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return false;
  try {
    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        priority: payload.priority ?? "high",
        content_available: true,
        notification: {
          title: payload.title,
          body: payload.body,
          sound: "default",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        data: payload.data,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn("FCM push failed:", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("FCM push error:", e);
    return false;
  }
}

async function getTokens(userId: string) {
  return prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true, platform: true },
  });
}

/** FCM — kiruvchi qo'ng'iroq push */
export async function sendIncomingCallPush(userId: string, data: IncomingCallPush) {
  const tokens = await getTokens(userId);
  if (tokens.length === 0) return { sent: 0 };
  let sent = 0;
  for (const { token, platform } of tokens) {
    const ok = await sendFcm(token, {
      title: "Tcall — Kiruvchi qo'ng'iroq",
      body: `${data.callerName} · ${data.callerTcallId}`,
      data: { type: "incoming_call", roomId: data.roomId, callerName: data.callerName, callerTcallId: data.callerTcallId, platform },
    });
    if (ok) sent++;
  }
  return { sent };
}

/** FCM — yangi chat xabar push */
export async function sendChatPush(
  userId: string,
  data: { senderName: string; text: string; conversationId: string }
) {
  const tokens = await getTokens(userId);
  if (tokens.length === 0) return { sent: 0 };
  let sent = 0;
  for (const { token, platform } of tokens) {
    const ok = await sendFcm(token, {
      title: `Tcall — ${data.senderName}`,
      body: data.text.slice(0, 100),
      priority: "normal",
      data: { type: "chat_message", conversationId: data.conversationId, senderName: data.senderName, platform },
    });
    if (ok) sent++;
  }
  return { sent };
}

/** FCM — do'stlik so'rovi push */
export async function sendFriendRequestPush(
  userId: string,
  data: { senderName: string; senderTcallId: string }
) {
  const tokens = await getTokens(userId);
  if (tokens.length === 0) return { sent: 0 };
  let sent = 0;
  for (const { token, platform } of tokens) {
    const ok = await sendFcm(token, {
      title: "Tcall — Do'stlik so'rovi",
      body: `${data.senderName} sizga do'stlik so'rovi yubordi`,
      priority: "normal",
      data: { type: "friend_request", senderName: data.senderName, senderTcallId: data.senderTcallId, platform },
    });
    if (ok) sent++;
  }
  return { sent };
}

/** FCM — o'tkazib yuborilgan qo'ng'iroq push */
export async function sendMissedCallPush(
  userId: string,
  data: { callerName: string; callerTcallId: string; roomId: string }
) {
  const tokens = await getTokens(userId);
  if (tokens.length === 0) return { sent: 0 };
  let sent = 0;
  for (const { token, platform } of tokens) {
    const ok = await sendFcm(token, {
      title: "Tcall — O'tkazib yuborilgan qo'ng'iroq",
      body: `${data.callerName} · ${data.callerTcallId}`,
      priority: "normal",
      data: { type: "missed_call", callerName: data.callerName, callerTcallId: data.callerTcallId, roomId: data.roomId, platform },
    });
    if (ok) sent++;
  }
  return { sent };
}
