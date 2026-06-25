import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUserTelegram, escapeHtml } from "@/lib/telegram";

interface TgUpdate {
  message?: {
    chat?: { id?: number | string };
    from?: { username?: string; first_name?: string };
    text?: string;
  };
}

export async function POST(req: NextRequest) {
  // Optional shared-secret check (set when registering the webhook).
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== secret) return NextResponse.json({ ok: true });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = (msg?.text || "").trim();

  if (!chatId || !text) return NextResponse.json({ ok: true });

  try {
    if (text.startsWith("/start")) {
      const code = text.split(/\s+/)[1]?.trim();

      if (code) {
        const user = await prisma.user.findFirst({
          where: { telegramLinkCode: code, telegramLinkExpires: { gt: new Date() } },
          select: { id: true, name: true },
        });
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              telegramChatId: String(chatId),
              telegramUsername: msg?.from?.username || undefined,
              telegramLinkCode: null,
              telegramLinkExpires: null,
            },
          });
          await notifyUserTelegram(
            String(chatId),
            `✅ <b>Tcall ulandi!</b>\nSalom, ${escapeHtml(user.name)}! Endi qo'ng'iroq va xabarlar haqida shu yerga bildirishnoma keladi — ilova yopiq bo'lsa ham.`
          );
        } else {
          await notifyUserTelegram(
            String(chatId),
            "⚠️ Ulanish kodi eskirgan yoki noto'g'ri. Tcall ilovasida <b>Sozlamalar → Bildirishnomalar → Telegramni ulash</b> tugmasini qayta bosing."
          );
        }
      } else {
        await notifyUserTelegram(
          String(chatId),
          "👋 Tcall botiga xush kelibsiz!\nBildirishnomalarni ulash uchun Tcall ilovasida <b>Sozlamalar → Bildirishnomalar → Telegramni ulash</b> tugmasini bosing."
        );
      }
    }
  } catch {
    /* always return 200 so Telegram doesn't retry endlessly */
  }

  return NextResponse.json({ ok: true });
}
