import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { telegramConfigured, getBotUsername } from "@/lib/telegram";

const LINK_TTL_MS = 15 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { telegramChatId: true, telegramUsername: true },
  });

  return NextResponse.json({
    configured: telegramConfigured() && !!getBotUsername(),
    linked: !!user?.telegramChatId,
    username: user?.telegramUsername || null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const botUsername = getBotUsername();
  if (!telegramConfigured() || !botUsername) {
    return NextResponse.json({ error: "Telegram hali sozlanmagan. Birozdan keyin urinib ko'ring." }, { status: 400 });
  }

  let code = crypto.randomBytes(8).toString("hex");
  const expires = new Date(Date.now() + LINK_TTL_MS);

  // Retry once on the unlikely unique collision.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await prisma.user.update({
        where: { id: session.userId },
        data: { telegramLinkCode: code, telegramLinkExpires: expires },
      });
      break;
    } catch {
      code = crypto.randomBytes(8).toString("hex");
      if (attempt === 1) {
        return NextResponse.json({ error: "Xatolik, qayta urinib ko'ring" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    url: `https://t.me/${botUsername}?start=${code}`,
    botUsername,
    expiresInSec: Math.round(LINK_TTL_MS / 1000),
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.userId },
    data: { telegramChatId: null, telegramLinkCode: null, telegramLinkExpires: null },
  });
  return NextResponse.json({ ok: true });
}
