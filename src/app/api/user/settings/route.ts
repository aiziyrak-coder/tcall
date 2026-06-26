import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, createToken, jsonWithSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isKnownLanguage } from "@/lib/lang-validators";
import { userAvatarUrl } from "@/lib/avatar-url";

const optionalStr = (max: number) => z.string().max(max).optional().nullable();

const schema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    language: z.string().refine((l) => isKnownLanguage(l)).optional(),
    translationMode: z.enum(["text", "voice"]).optional(),
    mode: z.enum(["text", "voice"]).optional(),
    status: z.enum(["available", "busy", "dnd", "away"]).optional(),
    bio: optionalStr(120),
    about: optionalStr(300),
    age: z.number().int().min(13).max(120).optional().nullable(),
    city: optionalStr(80),
    country: optionalStr(80),
    address: optionalStr(160),
    workplace: optionalStr(120),
    education: optionalStr(120),
    graduatedFrom: optionalStr(120),
    profession: optionalStr(80),
    interests: optionalStr(300),
    skills: optionalStr(300),
    telegramUsername: optionalStr(64),
  })
  .transform((d) => ({
    ...d,
    translationMode: d.translationMode ?? d.mode,
  }));

const userSelect = {
  id: true,
  email: true,
  name: true,
  language: true,
  translationMode: true,
  status: true,
  bio: true,
  about: true,
  avatar: true,
  age: true,
  city: true,
  country: true,
  address: true,
  workplace: true,
  education: true,
  graduatedFrom: true,
  profession: true,
  interests: true,
  skills: true,
  telegramUsername: true,
  tcallId: true,
} as const;

function withAvatarUrl(user: { id: string; avatar: string | null } & Record<string, unknown>) {
  const { id, avatar, ...rest } = user;
  return {
    ...rest,
    id,
    userId: id,
    avatar,
    avatarUrl: avatar ? userAvatarUrl(id, avatar) : null,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
      select: userSelect,
  });

  if (!user) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json({ user: withAvatarUrl(user) });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

    const body = schema.parse(await req.json());

    const data: Record<string, unknown> = {};
    const fields = [
      "name", "language", "translationMode", "status", "bio", "about", "age",
      "city", "country", "address", "workplace", "education", "graduatedFrom",
      "profession", "interests", "skills", "telegramUsername",
    ] as const;

    for (const key of fields) {
      if (body[key] !== undefined) {
        if (key === "telegramUsername" && typeof body[key] === "string") {
          data[key] = (body[key] as string).replace(/^@/, "").trim() || null;
        } else {
          data[key] = body[key];
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: userSelect,
    });

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      tcallId: user.tcallId!,
      translationMode: user.translationMode,
    });

    return jsonWithSession({ user: withAvatarUrl(user) }, token);
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
