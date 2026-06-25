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
): Promise<"sent" | "invalid_token" | "error"> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return "error";
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
      const text = await res.text();
      console.warn("FCM push failed:", text);
      return "error";
    }

    // Yaroqsiz tokenlarni aniqlash
    const json = await res.json().catch(() => ({}));
    const firstResult = json.results?.[0];
    if (
      firstResult?.error === "NotRegistered" ||
      firstResult?.error === "InvalidRegistration" ||
      firstResult?.error === "MismatchSenderId"
    ) {
      return "invalid_token";
    }

    return "sent";
  } catch (e) {
    console.error("FCM push error:", e);
    return "error";
  }
}

/** Yaroqsiz FCM tokenlarni DB dan tozalash */
async function cleanupTokens(invalidTokens: string[]) {
  if (invalidTokens.length === 0) return;
  try {
    await prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } });
  } catch {
    /* ignore */
  }
}

async function getTokens(userId: string) {
  return prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true, platform: true },
  });
}

async function sendToUser(
  userId: string,
  payload: { title: string; body: string; data: Record<string, string>; priority?: "high" | "normal" }
): Promise<{ sent: number }> {
  const tokens = await getTokens(userId);
  if (tokens.length === 0) return { sent: 0 };
  let sent = 0;
  const invalid: string[] = [];
  for (const { token, platform } of tokens) {
    const result = await sendFcm(token, { ...payload, data: { ...payload.data, platform } });
    if (result === "sent") sent++;
    else if (result === "invalid_token") invalid.push(token);
  }
  void cleanupTokens(invalid);
  return { sent };
}

export async function sendIncomingCallPush(userId: string, data: IncomingCallPush) {
  return sendToUser(userId, {
    title: "Tcall — Kiruvchi qo'ng'iroq",
    body: `${data.callerName} · ${data.callerTcallId}`,
    priority: "high",
    data: { type: "incoming_call", roomId: data.roomId, callerName: data.callerName, callerTcallId: data.callerTcallId },
  });
}

export async function sendChatPush(
  userId: string,
  data: { senderName: string; text: string; conversationId: string }
) {
  return sendToUser(userId, {
    title: `Tcall — ${data.senderName}`,
    body: data.text.slice(0, 120),
    priority: "normal",
    data: { type: "chat_message", conversationId: data.conversationId, senderName: data.senderName },
  });
}

export async function sendFriendRequestPush(
  userId: string,
  data: { senderName: string; senderTcallId: string }
) {
  return sendToUser(userId, {
    title: "Tcall — Do'stlik so'rovi",
    body: `${data.senderName} sizga do'stlik so'rovi yubordi`,
    priority: "normal",
    data: { type: "friend_request", senderName: data.senderName, senderTcallId: data.senderTcallId },
  });
}

export async function sendMissedCallPush(
  userId: string,
  data: { callerName: string; callerTcallId: string; roomId: string }
) {
  return sendToUser(userId, {
    title: "Tcall — O'tkazib yuborilgan qo'ng'iroq",
    body: `${data.callerName} · ${data.callerTcallId}`,
    priority: "normal",
    data: { type: "missed_call", callerName: data.callerName, callerTcallId: data.callerTcallId, roomId: data.roomId },
  });
}
