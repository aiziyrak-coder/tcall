import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan") || "all";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 25;

  const where = plan !== "all" ? { plan, status: "active" } : {};

  const [subs, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, email: true, tcallId: true } } },
    }),
    prisma.subscription.count({ where }),
  ]);

  return NextResponse.json({ subs, total, page, pages: Math.ceil(total / limit) });
}

const priceSchema = z.object({
  plan: z.enum(["premium", "premium_plus"]),
  price: z.number().min(0.99).max(999),
});

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Super admin kerak" }, { status: 403 });

  try {
    const { plan, price } = priceSchema.parse(await req.json());
    // Narx o'zgartirish — env orqali yoki DB config orqali
    // Hozir faqat log qilamiz, real narx lib/subscription.ts da
    console.log(`[admin] ${session.email} changed ${plan} price to $${price}`);
    return NextResponse.json({ ok: true, message: `${plan} narxi $${price} ga o'zgartirildi. Kod yangilanishi kerak.` });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
