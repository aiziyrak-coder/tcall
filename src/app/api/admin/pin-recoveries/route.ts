import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/pin";
import { notifyUserTelegram } from "@/lib/telegram";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);

  if (searchParams.get("count")) {
    const pendingCount = await prisma.pinRecoveryRequest.count({ where: { status: "pending" } });
    return NextResponse.json({ pendingCount });
  }

  const status = searchParams.get("status") || "pending";
  const where = status !== "all" ? { status } : {};

  const [requests, pendingCount] = await Promise.all([
    prisma.pinRecoveryRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: { id: true, name: true, email: true, tcallId: true, faceImage: true, telegramChatId: true },
        },
      },
    }),
    prisma.pinRecoveryRequest.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({ requests, pendingCount });
}

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const reqRow = await prisma.pinRecoveryRequest.findUnique({
    where: { id: body.id },
    include: { user: { select: { telegramChatId: true } } },
  });
  if (!reqRow) return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });

  if (body.action === "approve") {
    const resetToken = generateResetToken();
    await prisma.pinRecoveryRequest.update({
      where: { id: body.id },
      data: {
        status: "approved",
        resetToken,
        resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        note: body.note,
        resolvedAt: new Date(),
        resolvedBy: session.adminId || "admin",
      },
    });
    void notifyUserTelegram(
      reqRow.user.telegramChatId,
      "✅ Tcall: PIN tiklash so'rovingiz tasdiqlandi. Ilovaga qaytib, yangi PIN o'rnating."
    );
    return NextResponse.json({ ok: true, status: "approved" });
  }

  await prisma.pinRecoveryRequest.update({
    where: { id: body.id },
    data: {
      status: "rejected",
      resetToken: null,
      resetTokenExpiresAt: null,
      note: body.note,
      resolvedAt: new Date(),
      resolvedBy: session.adminId || "admin",
    },
  });
  void notifyUserTelegram(
    reqRow.user.telegramChatId,
    "❌ Tcall: PIN tiklash so'rovingiz rad etildi. Iltimos, qo'llab-quvvatlash bilan bog'laning."
  );
  return NextResponse.json({ ok: true, status: "rejected" });
}
