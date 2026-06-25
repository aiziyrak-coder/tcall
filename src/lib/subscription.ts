import { prisma } from "@/lib/prisma";

export type SubscriptionPlan = "free" | "premium" | "premium_plus";

export const SUBSCRIPTION_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  premium: 4.99,
  premium_plus: 9.99,
};

export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: ["Profil", "Qidirish", "Do'stlar"],
  premium: ["Profil", "Qidirish", "Do'stlar", "Chat", "Push bildirishnomalar"],
  premium_plus: ["Profil", "Qidirish", "Do'stlar", "Chat", "Push bildirishnomalar", "Audio qo'ng'iroq", "AI tarjima", "Tarjimon"],
};

export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, expiresAt: true },
  });
  if (!sub || sub.status !== "active") return "free";
  if (sub.expiresAt && sub.expiresAt < new Date()) return "free";
  return sub.plan as SubscriptionPlan;
}

export function canUsePlan(userPlan: SubscriptionPlan, required: SubscriptionPlan): boolean {
  const order: SubscriptionPlan[] = ["free", "premium", "premium_plus"];
  return order.indexOf(userPlan) >= order.indexOf(required);
}

export async function requirePlan(userId: string, required: SubscriptionPlan): Promise<{ ok: boolean; plan: SubscriptionPlan }> {
  const plan = await getUserPlan(userId);
  return { ok: canUsePlan(plan, required), plan };
}
