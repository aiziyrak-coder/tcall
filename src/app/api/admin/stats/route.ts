import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const monthAgo = new Date(Date.now() - 30 * 86400_000);

  const [
    totalUsers, newUsersToday, newUsersWeek,
    freePlan, premiumPlan, premiumPlusPlan,
    totalCalls, callsToday,
    totalMessages, pendingVanity,
    activeBans, pendingReports,
    totalRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.subscription.count({ where: { plan: "free", status: "active" } }),
    prisma.subscription.count({ where: { plan: "premium", status: "active" } }),
    prisma.subscription.count({ where: { plan: "premium_plus", status: "active" } }),
    prisma.call.count(),
    prisma.call.count({ where: { createdAt: { gte: today } } }),
    prisma.chatMessage.count({ where: { deletedAt: null } }),
    prisma.vanityNumberRequest.count({ where: { status: "pending" } }),
    prisma.userBan.count({ where: { active: true } }),
    prisma.contentReport.count({ where: { status: "pending" } }),
    prisma.subscription.aggregate({ _sum: { price: true }, where: { status: "active" } }),
  ]);

  const usersWithoutSub = totalUsers - (freePlan + premiumPlan + premiumPlusPlan);

  return NextResponse.json({
    users: { total: totalUsers, today: newUsersToday, week: newUsersWeek },
    subscriptions: {
      free: freePlan + usersWithoutSub,
      premium: premiumPlan,
      premiumPlus: premiumPlusPlan,
      monthlyRevenue: (premiumPlan * 4.99 + premiumPlusPlan * 9.99).toFixed(2),
    },
    calls: { total: totalCalls, today: callsToday },
    messages: { total: totalMessages },
    pending: { vanity: pendingVanity, reports: pendingReports },
    bans: activeBans,
    revenue: { total: (totalRevenue._sum.price ?? 0).toFixed(2) },
  });
}
