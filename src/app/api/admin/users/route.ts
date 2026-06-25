import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 25;

  const where = q
    ? {
        OR: [
          { email: { contains: q } },
          { name: { contains: q } },
          { tcallId: { contains: q } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, email: true, tcallId: true, language: true,
        createdAt: true, lastSeenAt: true,
        subscription: { select: { plan: true, status: true, expiresAt: true } },
        bans: { where: { active: true }, select: { id: true, reason: true, expiresAt: true } },
        vanityNumber: { select: { number: true, tier: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

const updateSchema = z.object({
  userId: z.string(),
  action: z.enum(["reset_password", "delete", "ban", "unban", "set_subscription"]),
  newPassword: z.string().min(6).optional(),
  banReason: z.string().max(500).optional(),
  banDays: z.number().int().min(1).max(365).optional(),
  plan: z.enum(["free", "premium", "premium_plus"]).optional(),
  planDays: z.number().int().min(1).max(3650).optional(),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  try {
    const body = updateSchema.parse(await req.json());
    const { userId, action } = body;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
    if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    switch (action) {
      case "reset_password": {
        if (!body.newPassword) return NextResponse.json({ error: "Yangi parol kerak" }, { status: 400 });
        const hash = await hashPassword(body.newPassword);
        await prisma.user.update({ where: { id: userId }, data: { password: hash } });
        return NextResponse.json({ ok: true, message: "Parol yangilandi" });
      }
      case "delete": {
        await prisma.user.delete({ where: { id: userId } });
        return NextResponse.json({ ok: true, message: "Foydalanuvchi o'chirildi" });
      }
      case "ban": {
        const expiresAt = body.banDays ? new Date(Date.now() + body.banDays * 86400_000) : null;
        await prisma.userBan.create({
          data: { userId, reason: body.banReason || "Admin tomonidan ban", bannedBy: session.email, expiresAt },
        });
        return NextResponse.json({ ok: true, message: "Ban qo'llanildi" });
      }
      case "unban": {
        await prisma.userBan.updateMany({ where: { userId, active: true }, data: { active: false } });
        return NextResponse.json({ ok: true, message: "Ban olib tashlandi" });
      }
      case "set_subscription": {
        if (!body.plan) return NextResponse.json({ error: "Plan kerak" }, { status: 400 });
        const expiresAt = body.planDays ? new Date(Date.now() + body.planDays * 86400_000) : null;
        const prices = { free: 0, premium: 4.99, premium_plus: 9.99 };
        await prisma.subscription.upsert({
          where: { userId },
          create: { userId, plan: body.plan, status: "active", expiresAt, price: prices[body.plan], grantedBy: session.email, note: body.note },
          update: { plan: body.plan, status: "active", expiresAt, price: prices[body.plan], grantedBy: session.email, note: body.note, updatedAt: new Date() },
        });
        return NextResponse.json({ ok: true, message: "Obuna yangilandi" });
      }
    }
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
