import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { LANGUAGES } from "@/lib/languages";
import { generateUniqueTcallId, seedVanityNumbers } from "@/lib/tcallId";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  language: z.string().refine((l) => LANGUAGES.some((lang) => lang.code === l)),
});

export async function POST(req: NextRequest) {
  try {
    await seedVanityNumbers();

    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email allaqachon ro'yxatdan o'tgan" }, { status: 400 });
    }

    const tcallId = await generateUniqueTcallId();
    const hashed = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        language: data.language,
        tcallId,
        translationMode: "text",
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

    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        language: user.language,
        tcallId: user.tcallId!,
        translationMode: user.translationMode,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Register error:", err);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
