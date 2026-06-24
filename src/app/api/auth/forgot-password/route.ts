import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isMailConfigured, sendPasswordResetEmail } from "@/lib/mail";
import {
  buildResetUrl,
  generateResetCode,
  hashResetCode,
  resetCodeExpiresAt,
} from "@/lib/password-reset";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limited = rateLimit(`forgot:${ip}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    if (!isMailConfigured()) {
      return NextResponse.json(
        { error: "Parol tiklash xizmati hozircha faol emas. Qo'llab-quvvatlash bilan bog'laning." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const code = generateResetCode();
      const codeHash = hashResetCode(code, user.id);
      const expiresAt = resetCodeExpiresAt();

      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await prisma.passwordResetToken.create({
        data: { userId: user.id, codeHash, expiresAt },
      });

      const resetUrl = buildResetUrl(code, email);
      const sent = await sendPasswordResetEmail(email, code, resetUrl);
      if (!sent) {
        return NextResponse.json(
          { error: "Email yuborib bo'lmadi. Keyinroq urinib ko'ring." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Agar bu email ro'yxatdan o'tgan bo'lsa, parol tiklash kodi yuborildi.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
