import { prisma } from "./prisma";
import { translateForChat } from "./openai";

export async function safeTranslateForChat(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ text: string; translated: boolean }> {
  if (!text.trim() || sourceLang === targetLang) {
    return { text, translated: false };
  }

  try {
    const translated = await translateForChat(text, sourceLang, targetLang);
    const ok = translated.trim() !== text.trim();
    return { text: translated || text, translated: ok };
  } catch (e) {
    console.error(`Chat translation error (${sourceLang} → ${targetLang}):`, e);
    return { text, translated: false };
  }
}

/** Xabar uchun barcha kerakli tillarda tarjimalarni yaratish yoki olish */
export async function ensureMessageTranslations(
  messageId: string,
  originalText: string,
  sourceLang: string,
  targetLangs: Iterable<string>,
  existing: { targetLang: string; text: string }[] = []
): Promise<{ targetLang: string; text: string }[]> {
  const map = new Map(existing.map((t) => [t.targetLang, t.text]));
  map.set(sourceLang, originalText);

  const needed = new Set<string>();
  for (const lang of targetLangs) {
    if (lang && lang !== sourceLang) needed.add(lang);
  }

  await Promise.all(
    [...needed].map(async (targetLang) => {
      if (map.has(targetLang)) return;
      const { text } = await safeTranslateForChat(originalText, sourceLang, targetLang);
      map.set(targetLang, text);
      await prisma.messageTranslation.upsert({
        where: { messageId_targetLang: { messageId, targetLang } },
        create: { messageId, targetLang, text },
        update: { text },
      });
    })
  );

  return [...map.entries()].map(([targetLang, text]) => ({ targetLang, text }));
}

/** Yuklashda yetishmayotgan tarjimani lazy backfill */
export async function backfillTranslationForUser(
  messageId: string,
  originalText: string,
  sourceLang: string,
  userLang: string,
  existing: { targetLang: string; text: string }[]
): Promise<{ targetLang: string; text: string }[]> {
  if (!originalText || sourceLang === userLang) return existing;

  const has = existing.some((t) => t.targetLang === userLang);
  if (has) return existing;

  const { text } = await safeTranslateForChat(originalText, sourceLang, userLang);
  await prisma.messageTranslation.upsert({
    where: { messageId_targetLang: { messageId, targetLang: userLang } },
    create: { messageId, targetLang: userLang, text },
    update: { text },
  });

  return [...existing, { targetLang: userLang, text }];
}

export async function getUserLanguage(userId: string, fallback = "uz"): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { language: true },
  });
  return user?.language || fallback;
}
