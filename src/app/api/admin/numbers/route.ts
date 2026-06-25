import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  classifyVanityNumber,
  tiersForFilter,
  allVanityTiers,
  toVanityUsdPrice,
  type VanityTier,
} from "@/lib/vanity-pricing";

const VALID_TIERS = new Set<string>(allVanityTiers());

/** GET — katalogni filtr/qidiruv/sahifalash bilan ro'yxatlash */
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const tier = searchParams.get("tier") || "all";
  const availability = searchParams.get("availability") || "all"; // all | available | sold
  const q = (searchParams.get("q") || "").replace(/\D/g, "");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 50)));

  const where: Prisma.VanityNumberWhereInput = {};
  if (availability === "available") where.available = true;
  else if (availability === "sold") where.available = false;

  if (tier && tier !== "all") {
    if (VALID_TIERS.has(tier)) {
      where.tier = tier;
    } else {
      const tiers = tiersForFilter(tier);
      if (tiers?.length) where.tier = { in: tiers };
    }
  }
  if (q.length >= 1) where.number = { contains: q };

  const [numbers, total, totalAll, availableAll, soldAll] = await Promise.all([
    prisma.vanityNumber.findMany({
      where,
      orderBy: [{ available: "desc" }, { price: "desc" }, { number: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        number: true,
        price: true,
        tier: true,
        available: true,
        purchasedAt: true,
        user: { select: { id: true, name: true, email: true, tcallId: true } },
      },
    }),
    prisma.vanityNumber.count({ where }),
    prisma.vanityNumber.count(),
    prisma.vanityNumber.count({ where: { available: true } }),
    prisma.vanityNumber.count({ where: { available: false } }),
  ]);

  return NextResponse.json({
    numbers,
    total,
    page,
    pages: Math.ceil(total / limit),
    counts: { total: totalAll, available: availableAll, sold: soldAll },
  });
}

const addSchema = z.object({
  number: z.string().regex(/^[1-9]\d{8}$/, "9 xonali raqam (1-9 bilan boshlanadi)"),
  tier: z.string().optional(),
  price: z.number().int().min(0).max(1_000_000).optional(),
});

/** POST — yangi raqam qo'shish */
export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  try {
    const body = await req.json();
    const { number, tier, price } = addSchema.parse(body);

    const existing = await prisma.vanityNumber.findUnique({ where: { number } });
    if (existing) {
      return NextResponse.json({ error: "Bu raqam katalogda mavjud" }, { status: 409 });
    }

    // Tier/narx berilmasa — avtomatik tasniflash
    const auto = classifyVanityNumber(number);
    const finalTier = (tier && VALID_TIERS.has(tier) ? tier : auto?.tier || "bronze") as VanityTier;
    const finalPrice = typeof price === "number" ? price : toVanityUsdPrice(finalTier);

    const created = await prisma.vanityNumber.create({
      data: { number, tier: finalTier, price: finalPrice, available: true },
      select: { id: true, number: true, tier: true, price: true, available: true },
    });
    return NextResponse.json({ ok: true, number: created });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    console.error("Admin numbers POST error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["update", "release"]).default("update"),
  price: z.number().int().min(0).max(1_000_000).optional(),
  tier: z.string().optional(),
  available: z.boolean().optional(),
});

/** PATCH — raqamni tahrirlash yoki egasidan bo'shatish */
export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  try {
    const body = patchSchema.parse(await req.json());
    const num = await prisma.vanityNumber.findUnique({ where: { id: body.id } });
    if (!num) return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });

    if (body.action === "release") {
      // Raqamni egasidan bo'shatish (sotuvga qaytarish) — egasining tcallId si o'zgarmaydi
      const updated = await prisma.vanityNumber.update({
        where: { id: num.id },
        data: { available: true, userId: null, purchasedAt: null },
        select: { id: true, number: true, available: true },
      });
      return NextResponse.json({ ok: true, number: updated });
    }

    const data: Prisma.VanityNumberUpdateInput = {};
    if (typeof body.price === "number") data.price = body.price;
    if (body.tier && VALID_TIERS.has(body.tier)) data.tier = body.tier;
    if (typeof body.available === "boolean") data.available = body.available;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "O'zgartirish yo'q" }, { status: 400 });
    }

    const updated = await prisma.vanityNumber.update({
      where: { id: num.id },
      data,
      select: { id: true, number: true, price: true, tier: true, available: true },
    });
    return NextResponse.json({ ok: true, number: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    console.error("Admin numbers PATCH error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

/** DELETE — raqamni katalogdan o'chirish (faqat sotilmagan) */
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID kerak" }, { status: 400 });

  const num = await prisma.vanityNumber.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!num) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (num.userId) {
    return NextResponse.json({ error: "Egasi bor raqamni o'chirib bo'lmaydi. Avval bo'shating." }, { status: 409 });
  }

  await prisma.vanityNumber.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
