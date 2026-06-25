import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseDescriptor,
  faceDistance,
  generateResetToken,
  FACE_AUTO_MATCH_THRESHOLD,
  FACE_LIKELY_THRESHOLD,
} from "@/lib/pin";
import { notifyAdminTelegram } from "@/lib/telegram";

const IMAGE_MAX = 1_500_000;
const schema = z.object({
  faceImage: z.string().min(100).max(IMAGE_MAX),
  faceDescriptor: z.array(z.number()).max(256).optional(),
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Yuz rasmi yuborilmadi" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { pinHash: true, faceImage: true, faceDescriptor: true, name: true, tcallId: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
  if (!user.pinHash) {
    return NextResponse.json({ error: "PIN o'rnatilmagan, tiklash shart emas" }, { status: 400 });
  }

  // Re-use a recent pending request instead of creating duplicates
  const existingPending = await prisma.pinRecoveryRequest.findFirst({
    where: { userId: session.userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  if (existingPending && Date.now() - existingPending.createdAt.getTime() < 10 * 60 * 1000) {
    return NextResponse.json({ ok: true, status: "pending", autoMatched: false, alreadyPending: true });
  }

  // AI similarity (if both descriptors available)
  let similarity: number | null = null;
  const enrollDesc = parseDescriptor(user.faceDescriptor);
  const newDesc = body.faceDescriptor && body.faceDescriptor.length >= 64 ? body.faceDescriptor : null;
  if (enrollDesc && newDesc) {
    similarity = faceDistance(enrollDesc, newDesc);
  }

  const autoMatched = similarity != null && similarity <= FACE_AUTO_MATCH_THRESHOLD;
  const resetToken = autoMatched ? generateResetToken() : null;

  const request = await prisma.pinRecoveryRequest.create({
    data: {
      userId: session.userId,
      faceImage: body.faceImage,
      similarity,
      autoMatched,
      status: autoMatched ? "approved" : "pending",
      resetToken,
      resetTokenExpiresAt: autoMatched ? new Date(Date.now() + RESET_TOKEN_TTL_MS) : null,
      resolvedAt: autoMatched ? new Date() : null,
      resolvedBy: autoMatched ? "ai" : null,
    },
  });

  const who = `${user.name} (${user.tcallId || user.email})`;
  const simText =
    similarity == null
      ? "AI: yuz tavsifi yo'q (qo'lda tekshirish kerak)"
      : `AI o'xshashlik masofasi: ${similarity.toFixed(3)} ${
          similarity <= FACE_AUTO_MATCH_THRESHOLD
            ? "(yuqori ishonch — avtomatik tasdiqlandi)"
            : similarity <= FACE_LIKELY_THRESHOLD
            ? "(ehtimol mos)"
            : "(mos kelmasligi mumkin)"
        }`;
  void notifyAdminTelegram(
    `🔐 PIN tiklash so'rovi\n${who}\n${simText}\n${
      autoMatched ? "✅ AI avtomatik tasdiqladi." : "⏳ Admin tasdiqlashi kutilmoqda. Admin panel → PIN tiklash."
    }`
  );

  return NextResponse.json({
    ok: true,
    requestId: request.id,
    status: request.status,
    autoMatched,
    resetToken: autoMatched ? resetToken : undefined,
    similarity,
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const request = await prisma.pinRecoveryRequest.findFirst({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });
  if (!request) return NextResponse.json({ status: "none" });

  const tokenValid =
    request.status === "approved" &&
    !!request.resetToken &&
    !!request.resetTokenExpiresAt &&
    request.resetTokenExpiresAt.getTime() > Date.now();

  return NextResponse.json({
    status: request.status,
    autoMatched: request.autoMatched,
    similarity: request.similarity,
    createdAt: request.createdAt,
    note: request.note,
    resetToken: tokenValid ? request.resetToken : undefined,
  });
}
