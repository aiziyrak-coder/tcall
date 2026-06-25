import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(300),
    auth: z.string().min(5).max(300),
  }),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let data: z.infer<typeof subSchema>;
  try {
    data = subSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Noto'g'ri obuna" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 300) || null;

  await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: {
      userId: session.userId,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userAgent,
    },
    update: {
      userId: session.userId,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(await req.json());
    await prisma.pushSubscription.deleteMany({ where: { userId: session.userId, endpoint } });
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
