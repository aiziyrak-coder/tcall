import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  tcallId: z.string().regex(/^\d{9}$/),
  favorite: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const contacts = await prisma.contact.findMany({
    where: { ownerId: session.userId },
    orderBy: [{ favorite: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`contact:${session.userId}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });
  }

  try {
    const body = createSchema.parse(await req.json());

    if (body.tcallId === session.tcallId) {
      return NextResponse.json({ error: "O'zingizni kontakt sifatida qo'shib bo'lmaydi" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { tcallId: body.tcallId } });
    if (!user) return NextResponse.json({ error: "Raqam topilmadi" }, { status: 404 });

    const contact = await prisma.contact.upsert({
      where: { ownerId_tcallId: { ownerId: session.userId, tcallId: body.tcallId } },
      create: {
        ownerId: session.userId,
        name: body.name,
        tcallId: body.tcallId,
        favorite: body.favorite ?? false,
        notes: body.notes,
      },
      update: {
        name: body.name,
        ...(body.favorite !== undefined && { favorite: body.favorite }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({ contact });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
