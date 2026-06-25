import { prisma } from "./prisma";
import { sendFcmV1 } from "./fcm";

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
    isCall?: boolean;
  }
): Promise<"sent" | "invalid_token" | "error"> {
  return sendFcmV1(token, {
    title: payload.title,
    body: payload.body,
    data: payload.data,
    isCall: payload.isCall ?? payload.priority === "high",
  });
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
  payload: { title: string; body: string; data: Record<string, string>; priority?: "high" | "normal"; isCall?: boolean }
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
    isCall: true,
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
