/**
 * Markaziy ban + subscription tekshiruvi — barcha API route larda ishlatiladi
 */
import { prisma } from "@/lib/prisma";
import { requirePlan, type SubscriptionPlan } from "@/lib/subscription";

export type GuardResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      status: number;
      code?: string;
      requiresPlan?: SubscriptionPlan;
      currentPlan?: SubscriptionPlan;
    };

/** Foydalanuvchi banlanganmi tekshiradi */
export async function checkBan(userId: string): Promise<GuardResult> {
  const ban = await prisma.userBan.findFirst({
    where: {
      userId,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { reason: true, expiresAt: true },
  });

  if (ban) {
    const expires = ban.expiresAt
      ? ` (${ban.expiresAt.toLocaleDateString("uz")} gacha)`
      : " (muddatsiz)";
    return {
      ok: false,
      error: `Hisobingiz bloklangan${expires}: ${ban.reason}`,
      status: 403,
      code: "BANNED",
    };
  }
  return { ok: true };
}

/** Ban + plan tekshiruvini birga qiladi */
export async function guardUser(
  userId: string,
  requiredPlan?: SubscriptionPlan
): Promise<GuardResult> {
  const banResult = await checkBan(userId);
  if (!banResult.ok) return banResult;

  if (requiredPlan) {
    const { ok: canUse, plan } = await requirePlan(userId, requiredPlan);
    if (!canUse) {
      const planLabels: Record<SubscriptionPlan, string> = {
        free: "Bepul",
        premium: "Premium ($4.99/oy)",
        premium_plus: "Premium+ ($9.99/oy)",
      };
      return {
        ok: false,
        error: `Bu funksiya uchun ${planLabels[requiredPlan]} obuna kerak. Joriy tarif: ${planLabels[plan]}`,
        status: 402,
        code: "SUBSCRIPTION_REQUIRED",
        requiresPlan: requiredPlan,
        currentPlan: plan,
      };
    }
  }

  return { ok: true };
}
