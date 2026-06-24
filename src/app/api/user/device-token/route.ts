import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(["android", "ios"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  try {
    const data = schema.parse(await req.json());
    await prisma.deviceToken.upsert({
      where: { userId_token: { userId: session.userId, token: data.token } },
      create: {
        userId: session.userId,
        token: data.token,
        platform: data.platform,
      },
      update: { platform: data.platform },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  try {
    const { token } = schema.partial({ platform: true }).parse(await req.json());
    if (token) {
      await prisma.deviceToken.deleteMany({
        where: { userId: session.userId, token },
      });
    } else {
      await prisma.deviceToken.deleteMany({ where: { userId: session.userId } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
