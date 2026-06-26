import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, jsonWithSession, verifyPassword } from "@/lib/auth";
import { generateUniqueTcallId } from "@/lib/tcallId";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const limited = rateLimit(`login:${ip}`, 15, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await verifyPassword(data.password, user.password))) {
      return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 });
    }

    let tcallId = user.tcallId;
    if (!tcallId) {
      tcallId = await generateUniqueTcallId();
      await prisma.user.update({ where: { id: user.id }, data: { tcallId } });
    }

    // Qurilma / IP kuzatuvi (best-effort)
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 400);
    void prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip, lastUserAgent: userAgent } })
      .catch(() => {});

    const persistent =
      req.headers.get("x-tcall-native") === "1" || data.remember === true;

    const token = await createToken(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        tcallId,
        translationMode: user.translationMode,
      },
      persistent
    );

    const userPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      tcallId,
      translationMode: user.translationMode,
    };

    const responseBody: { user: typeof userPayload; token: string } = {
      user: userPayload,
      token,
    };

    return jsonWithSession(responseBody, token, 200, persistent);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
