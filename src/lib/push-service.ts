import { prisma } from "./prisma";

export interface IncomingCallPush {
  roomId: string;
  callerName: string;
  callerTcallId: string;
}

/** FCM orqali kiruvchi qo'ng'iroq push (ilova yopiq/background) */
export async function sendIncomingCallPush(userId: string, data: IncomingCallPush) {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return { sent: 0 };

  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true, platform: true },
  });
  if (tokens.length === 0) return { sent: 0 };

  let sent = 0;
  for (const { token, platform } of tokens) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${serverKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          priority: "high",
          content_available: true,
          notification: {
            title: "Tcall — Kiruvchi qo'ng'iroq",
            body: `${data.callerName} · ${data.callerTcallId}`,
            sound: "default",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          data: {
            type: "incoming_call",
            roomId: data.roomId,
            callerName: data.callerName,
            callerTcallId: data.callerTcallId,
            platform,
          },
        }),
      });
      if (res.ok) sent += 1;
      else console.warn("FCM push failed:", await res.text());
    } catch (e) {
      console.error("FCM push error:", e);
    }
  }
  return { sent };
}
