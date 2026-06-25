/**
 * Telegram bot orqali bildirishnoma yuborish.
 * Sozlash: TELEGRAM_BOT_TOKEN (BotFather), TELEGRAM_ADMIN_CHAT_ID (admin ID, masalan 5573250102).
 * Foydalanuvchi botni /start qilgach, uning chatId si saqlanadi va unga ham yuboriladi.
 */

function botApi(path: string): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return `https://api.telegram.org/bot${token}/${path}`;
}

export function telegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

export function getBotUsername(): string {
  return (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
}

/** Escape user-provided text for Telegram HTML parse_mode. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendMessage(chatId: string | number, text: string): Promise<boolean> {
  const url = botApi("sendMessage");
  if (!url || !chatId) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.warn("Telegram sendMessage failed:", res.status, t.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Telegram send error:", e);
    return false;
  }
}

/** Admin Telegram ID siga bildirishnoma */
export async function notifyAdminTelegram(text: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId) return false;
  return sendMessage(chatId, text);
}

/** Foydalanuvchining Telegramiga (agar bog'langan bo'lsa) */
export async function notifyUserTelegram(chatId: string | null | undefined, text: string): Promise<boolean> {
  if (!chatId) return false;
  return sendMessage(chatId, text);
}

/** Telegram webhook (/start <token>) ni o'rnatish — ixtiyoriy yordamchi */
export async function setTelegramWebhook(url: string): Promise<boolean> {
  const api = botApi("setWebhook");
  if (!api) return false;
  try {
    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, allowed_updates: ["message"] }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
