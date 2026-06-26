import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { hashPin, isValidPin, resetPinAttempts } from "@/lib/pin";
import { purgeUsersByIds, purgeTestUsers, countTestUsers } from "@/lib/admin-cleanup";
import { parseUserAgent, lookupIpLocation } from "@/lib/device-geo";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);

  // Bitta foydalanuvchining to'liq ma'lumoti
  const detailId = searchParams.get("userId");
  if (detailId) {
    const user = await prisma.user.findUnique({
      where: { id: detailId },
      select: {
        id: true, name: true, email: true, tcallId: true, language: true, status: true,
        bio: true, about: true, age: true, city: true, country: true, address: true,
        workplace: true, education: true, graduatedFrom: true, profession: true,
        interests: true, skills: true, telegramUsername: true, avatar: true,
        createdAt: true, lastSeenAt: true, lastLoginAt: true, lastLoginIp: true, lastUserAgent: true,
        pinHash: true, faceImage: true,
        subscription: { select: { plan: true, status: true, expiresAt: true, price: true } },
        vanityNumber: { select: { number: true, tier: true } },
        bans: { where: { active: true }, select: { id: true, reason: true, expiresAt: true, createdAt: true } },
        _count: { select: { hostedCalls: true, chatMessagesSent: true, contacts: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    const device = parseUserAgent(user.lastUserAgent);
    const location = await lookupIpLocation(user.lastLoginIp);
    const { pinHash, faceImage, ...safeUser } = user;

    return NextResponse.json({
      user: {
        ...safeUser,
        pinEnabled: !!pinHash,
        faceEnrolled: !!faceImage,
      },
      device,
      location,
    });
  }

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
        pinHash: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const testUsers = await countTestUsers();

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      pinEnabled: !!u.pinHash,
      pinHash: undefined,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
    testUsers,
  });
}

const updateSchema = z.object({
  userId: z.string().optional(),
  action: z.enum([
    "reset_password",
    "delete",
    "ban",
    "unban",
    "set_subscription",
    "purge_test_users",
    "clear_pin",
    "admin_set_pin",
  ]),
  newPassword: z.string().min(6).optional(),
  newPin: z.string().optional(),
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

    // Test/mock foydalanuvchilarni ommaviy tozalash — userId shart emas (faqat super_admin)
    if (action === "purge_test_users") {
      if (session.role !== "super_admin") {
        return NextResponse.json({ error: "Super admin kerak" }, { status: 403 });
      }
      const { deleted } = await purgeTestUsers();
      return NextResponse.json({ ok: true, message: `${deleted} ta test foydalanuvchi o'chirildi`, deleted });
    }

    if (!userId) return NextResponse.json({ error: "userId kerak" }, { status: 400 });

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
        await purgeUsersByIds([userId]);
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
      case "clear_pin": {
        await prisma.user.update({
          where: { id: userId },
          data: {
            pinHash: null,
            pinUpdatedAt: new Date(),
            faceImage: null,
            faceDescriptor: null,
          },
        });
        resetPinAttempts(userId);
        return NextResponse.json({ ok: true, message: "Foydalanuvchi PIN qulfi o'chirildi" });
      }
      case "admin_set_pin": {
        if (!body.newPin || !isValidPin(body.newPin)) {
          return NextResponse.json({ error: "Yangi PIN 4 ta raqam bo'lishi kerak" }, { status: 400 });
        }
        const newHash = await hashPin(body.newPin);
        await prisma.user.update({
          where: { id: userId },
          data: { pinHash: newHash, pinUpdatedAt: new Date() },
        });
        resetPinAttempts(userId);
        return NextResponse.json({ ok: true, message: "Foydalanuvchi PIN yangilandi" });
      }
    }
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
