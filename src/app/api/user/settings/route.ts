import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, createToken, jsonWithSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LANGUAGES } from "@/lib/languages";

const schema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    language: z.string().refine((l) => LANGUAGES.some((lang) => lang.code === l)).optional(),
    translationMode: z.enum(["text", "voice"]).optional(),
    mode: z.enum(["text", "voice"]).optional(),
    status: z.enum(["available", "busy", "dnd", "away"]).optional(),
    bio: z.string().max(160).optional(),
  })
  .transform((d) => ({
    ...d,
    translationMode: d.translationMode ?? d.mode,
  }));

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, language: true, translationMode: true, status: true, bio: true, tcallId: true },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

    const body = schema.parse(await req.json());

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.language !== undefined && { language: body.language }),
        ...(body.translationMode !== undefined && { translationMode: body.translationMode }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.bio !== undefined && { bio: body.bio }),
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

    return jsonWithSession(
      {
        name: user.name,
        language: user.language,
        translationMode: user.translationMode,
        status: user.status,
        bio: user.bio,
      },
      token
    );
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
