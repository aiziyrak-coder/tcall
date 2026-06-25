import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPin, verifyPin, isValidPin, resetPinAttempts, serializeDescriptor } from "@/lib/pin";

const IMAGE_MAX = 1_500_000;

const setSchema = z.object({
  pin: z.string(),
  faceImage: z.string().max(IMAGE_MAX).optional(),
  faceDescriptor: z.array(z.number()).max(256).optional(),
  resetToken: z.string().min(10).max(120).optional(),
});

const changeSchema = z.object({
  currentPin: z.string(),
  pin: z.string(),
});

const disableSchema = z.object({
  pin: z.string(),
});

const faceSchema = z.object({
  currentPin: z.string(),
  faceImage: z.string().max(IMAGE_MAX),
  faceDescriptor: z.array(z.number()).max(256).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { pinHash: true, faceImage: true },
  });
  return NextResponse.json({
    enabled: !!user?.pinHash,
    faceEnrolled: !!user?.faceImage,
  });
}

// Set / enable PIN (initial) or reset PIN via approved recovery token
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let body: z.infer<typeof setSchema>;
  try {
    body = setSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  if (!isValidPin(body.pin)) {
    return NextResponse.json({ error: "PIN 4 ta raqamdan iborat bo'lishi kerak" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { pinHash: true, faceImage: true },
  });
  if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

  // PIN already set -> reset requires an approved, non-expired recovery token
  if (user.pinHash) {
    if (!body.resetToken) {
      return NextResponse.json(
        { error: "PIN allaqachon o'rnatilgan. O'zgartirish uchun joriy PIN, tiklash uchun so'rov kerak." },
        { status: 403 }
      );
    }
    const reqRow = await prisma.pinRecoveryRequest.findFirst({
      where: {
        userId: session.userId,
        status: "approved",
        resetToken: body.resetToken,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });
    if (!reqRow) {
      return NextResponse.json({ error: "Tiklash tokeni yaroqsiz yoki muddati o'tgan" }, { status: 403 });
    }
    const newHash = await hashPin(body.pin);
    await prisma.$transaction([
      prisma.user.update({ where: { id: session.userId }, data: { pinHash: newHash, pinUpdatedAt: new Date() } }),
      prisma.pinRecoveryRequest.update({
        where: { id: reqRow.id },
        data: { status: "used", resetToken: null, resetTokenExpiresAt: null, resolvedAt: new Date() },
      }),
    ]);
    resetPinAttempts(session.userId);
    return NextResponse.json({ ok: true, enabled: true });
  }

  // Initial enable
  const newHash = await hashPin(body.pin);
  const descriptor = serializeDescriptor(body.faceDescriptor);
  await prisma.user.update({
    where: { id: session.userId },
    data: {
      pinHash: newHash,
      pinUpdatedAt: new Date(),
      ...(body.faceImage ? { faceImage: body.faceImage } : {}),
      ...(descriptor ? { faceDescriptor: descriptor } : {}),
    },
  });
  resetPinAttempts(session.userId);
  return NextResponse.json({ ok: true, enabled: true, faceEnrolled: !!body.faceImage });
}

// Change PIN with the current PIN
export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let body: z.infer<typeof changeSchema>;
  try {
    body = changeSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  if (!isValidPin(body.pin)) {
    return NextResponse.json({ error: "Yangi PIN 4 ta raqamdan iborat bo'lishi kerak" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { pinHash: true } });
  if (!user?.pinHash) {
    return NextResponse.json({ error: "PIN o'rnatilmagan" }, { status: 400 });
  }
  const ok = await verifyPin(body.currentPin, user.pinHash);
  if (!ok) return NextResponse.json({ error: "Joriy PIN noto'g'ri" }, { status: 400 });

  const newHash = await hashPin(body.pin);
  await prisma.user.update({ where: { id: session.userId }, data: { pinHash: newHash, pinUpdatedAt: new Date() } });
  resetPinAttempts(session.userId);
  return NextResponse.json({ ok: true });
}

// Update enrollment face (requires current PIN)
export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let body: z.infer<typeof faceSchema>;
  try {
    body = faceSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { pinHash: true } });
  if (!user?.pinHash) return NextResponse.json({ error: "PIN o'rnatilmagan" }, { status: 400 });

  const ok = await verifyPin(body.currentPin, user.pinHash);
  if (!ok) return NextResponse.json({ error: "Joriy PIN noto'g'ri" }, { status: 400 });

  const descriptor = serializeDescriptor(body.faceDescriptor);
  await prisma.user.update({
    where: { id: session.userId },
    data: { faceImage: body.faceImage, faceDescriptor: descriptor },
  });
  return NextResponse.json({ ok: true, faceEnrolled: true });
}

// Disable PIN lock (requires current PIN)
export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let body: z.infer<typeof disableSchema>;
  try {
    body = disableSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { pinHash: true } });
  if (!user?.pinHash) return NextResponse.json({ ok: true });

  const ok = await verifyPin(body.pin, user.pinHash);
  if (!ok) return NextResponse.json({ error: "PIN noto'g'ri" }, { status: 400 });

  await prisma.user.update({ where: { id: session.userId }, data: { pinHash: null, pinUpdatedAt: new Date() } });
  resetPinAttempts(session.userId);
  return NextResponse.json({ ok: true, enabled: false });
}
