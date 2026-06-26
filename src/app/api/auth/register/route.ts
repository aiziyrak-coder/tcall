import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, hashPassword, jsonWithSession } from "@/lib/auth";
import { isKnownLanguage } from "@/lib/lang-validators";
import { generateUniqueTcallId } from "@/lib/tcallId";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(6).max(128),
  name: z.string().min(2).max(80).transform((n) => n.trim()),
  language: z.string().refine((l) => isKnownLanguage(l)),
  ref: z.string().trim().max(32).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limited = rateLimit(`register:${ip}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email allaqachon ro'yxatdan o'tgan" }, { status: 400 });
    }

    const tcallId = await generateUniqueTcallId();
    const hashed = await hashPassword(data.password);

    // Resolve referral code (a referrer's Tcall ID) into the referrer's user id.
    let referredById: string | null = null;
    if (data.ref) {
      const refCode = data.ref.replace(/\D/g, "");
      if (refCode) {
        const referrer = await prisma.user.findUnique({ where: { tcallId: refCode }, select: { id: true } });
        if (referrer) referredById = referrer.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        language: data.language,
        tcallId,
        translationMode: "text",
        status: "available",
        referredById,
      },
    });

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      tcallId: user.tcallId!,
      translationMode: user.translationMode,
    });

    const userPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      tcallId: user.tcallId!,
      translationMode: user.translationMode,
    };

    const responseBody: { user: typeof userPayload; token: string } = {
      user: userPayload,
      token,
    };

    return jsonWithSession(responseBody, token);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Register error:", err);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
