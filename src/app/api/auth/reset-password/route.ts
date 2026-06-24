import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyResetCode } from "@/lib/password-reset";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(6).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limited = rateLimit(`reset:${ip}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return NextResponse.json({ error: "Kod noto'g'ri yoki muddati tugagan" }, { status: 400 });
    }

    const token = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!token || !verifyResetCode(data.code, user.id, token.codeHash)) {
      return NextResponse.json({ error: "Kod noto'g'ri yoki muddati tugagan" }, { status: 400 });
    }

    const hashed = await hashPassword(data.password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true, message: "Parol yangilandi. Endi kirishingiz mumkin." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
