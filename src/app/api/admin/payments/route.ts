import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { activatePayment, expireOldPayments } from "@/lib/payments";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  await expireOldPayments();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 30;

  const where = status !== "all" ? { status } : {};

  const [payments, total, pendingCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true, email: true, tcallId: true } } },
    }),
    prisma.payment.count({ where }),
    prisma.payment.count({ where: { status: "pending", expiresAt: { gt: new Date() } } }),
  ]);

  return NextResponse.json({ payments, total, page, pages: Math.ceil(total / limit), pendingCount });
}

const patchSchema = z.object({
  paymentId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  try {
    const { paymentId, action } = patchSchema.parse(await req.json());

    if (action === "reject") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "cancelled", approvedBy: session.email, note: "admin rad etdi" },
      });
      return NextResponse.json({ ok: true, status: "cancelled" });
    }

    await activatePayment(paymentId, { approvedBy: session.email, source: "admin" });
    return NextResponse.json({ ok: true, status: "paid" });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "To'lov topilmadi" }, { status: 404 });
    console.error("Admin payments PATCH error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
