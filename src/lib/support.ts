import { prisma } from "@/lib/prisma";
import { safeTranslateForChat } from "@/lib/chat-translate";
import { notifyAdminTelegram, notifyUserTelegram } from "@/lib/telegram";
import { getLanguageName } from "@/lib/languages";

const ADMIN_LANG = "uz";

/** Foydalanuvchi qo'llab-quvvatlashga xabar yuboradi */
export async function sendUserSupportMessage(userId: string, text: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, tcallId: true, language: true },
  });
  const userLang = user?.language || "uz";

  // Admin uchun o'zbekchaga tarjima
  const { text: uzText } = await safeTranslateForChat(text, userLang, ADMIN_LANG);

  const msg = await prisma.supportMessage.create({
    data: {
      userId,
      sender: "user",
      originalText: text,
      originalLang: userLang,
      translatedText: uzText,
      readByUser: true,
      readByAdmin: false,
    },
  });

  // Admin Telegram bildirishnomasi
  const langName = getLanguageName(userLang);
  void notifyAdminTelegram(
    `🆘 <b>Yangi qo'llab-quvvatlash xabari</b>\n` +
      `👤 ${user?.name || "Foydalanuvchi"} (${user?.tcallId || "—"}) · ${langName}\n\n` +
      `${escapeHtml(uzText)}` +
      (uzText.trim() !== text.trim() ? `\n\n<i>Asl: ${escapeHtml(text)}</i>` : "")
  );

  return msg;
}

/** Admin foydalanuvchiga javob qaytaradi (o'zbekcha → foydalanuvchi tiliga) */
export async function sendAdminSupportReply(userId: string, uzText: string, adminEmail: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true, telegramChatId: true, name: true },
  });
  const userLang = user?.language || "uz";

  const { text: translated } = await safeTranslateForChat(uzText, ADMIN_LANG, userLang);

  const msg = await prisma.supportMessage.create({
    data: {
      userId,
      sender: "admin",
      originalText: uzText,
      originalLang: ADMIN_LANG,
      translatedText: translated,
      adminEmail,
      readByUser: false,
      readByAdmin: true,
    },
  });

  // Foydalanuvchi Telegramiga (agar bog'langan bo'lsa)
  void notifyUserTelegram(
    user?.telegramChatId,
    `💬 <b>Tcall qo'llab-quvvatlash</b>\n\n${escapeHtml(translated)}`
  );

  return msg;
}

/** Foydalanuvchi o'z yozishmasini oladi (admin xabarlarini o'qilgan deb belgilaydi) */
export async function getUserThread(userId: string) {
  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  await prisma.supportMessage.updateMany({
    where: { userId, sender: "admin", readByUser: false },
    data: { readByUser: true },
  });
  return messages;
}

export async function getUserUnreadCount(userId: string): Promise<number> {
  return prisma.supportMessage.count({
    where: { userId, sender: "admin", readByUser: false },
  });
}

/** Admin: barcha yozishmalar ro'yxati (oxirgi xabar + o'qilmaganlar soni) */
export async function listSupportTickets() {
  const grouped = await prisma.supportMessage.groupBy({
    by: ["userId"],
    _max: { createdAt: true },
    _count: { _all: true },
  });

  const userIds = grouped.map((g) => g.userId);
  if (userIds.length === 0) return [];

  const [users, lastMessages, unreadRows] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, tcallId: true, language: true },
    }),
    prisma.supportMessage.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["userId"],
      select: { userId: true, sender: true, originalText: true, translatedText: true, createdAt: true },
    }),
    prisma.supportMessage.groupBy({
      by: ["userId"],
      where: { sender: "user", readByAdmin: false },
      _count: { _all: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const lastMap = new Map(lastMessages.map((m) => [m.userId, m]));
  const unreadMap = new Map(unreadRows.map((r) => [r.userId, r._count._all]));

  return grouped
    .map((g) => {
      const u = userMap.get(g.userId);
      const last = lastMap.get(g.userId);
      return {
        userId: g.userId,
        name: u?.name || "—",
        email: u?.email || "",
        tcallId: u?.tcallId || null,
        language: u?.language || "uz",
        lastText: last ? (last.sender === "user" ? last.translatedText || last.originalText : last.originalText) : "",
        lastSender: last?.sender || "",
        lastAt: g._max.createdAt,
        unread: unreadMap.get(g.userId) || 0,
        total: g._count._all,
      };
    })
    .sort((a, b) => (b.lastAt?.getTime() || 0) - (a.lastAt?.getTime() || 0));
}

/** Admin: bitta foydalanuvchi yozishmasi (o'qilgan deb belgilaydi) */
export async function getAdminThread(userId: string) {
  const [user, messages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, tcallId: true, language: true },
    }),
    prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 300,
    }),
  ]);
  await prisma.supportMessage.updateMany({
    where: { userId, sender: "user", readByAdmin: false },
    data: { readByAdmin: true },
  });
  return { user, messages };
}

export async function countAdminUnread(): Promise<number> {
  return prisma.supportMessage.count({ where: { sender: "user", readByAdmin: false } });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
