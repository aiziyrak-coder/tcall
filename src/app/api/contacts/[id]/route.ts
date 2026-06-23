import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  favorite: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const data = patchSchema.parse(await req.json());
    const existing = await prisma.contact.findFirst({
      where: { id: params.id, ownerId: session.userId },
    });
    if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const contact = await prisma.contact.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ contact });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, ownerId: session.userId },
  });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
