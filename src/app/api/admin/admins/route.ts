import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, hashAdminPassword } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session || session.role !== "super_admin") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const admins = await prisma.adminUser.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true, lastLoginAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ admins });
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8),
  role: z.enum(["admin", "super_admin"]).default("admin"),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session || session.role !== "super_admin") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  try {
    const body = createSchema.parse(await req.json());
    const existing = await prisma.adminUser.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: "Bu email allaqachon mavjud" }, { status: 409 });
    const passwordHash = await hashAdminPassword(body.password);
    const admin = await prisma.adminUser.create({
      data: { email: body.email, name: body.name, passwordHash, role: body.role },
      select: { id: true, email: true, name: true, role: true },
    });
    return NextResponse.json({ ok: true, admin });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session || session.role !== "super_admin") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID kerak" }, { status: 400 });

  const admin = await prisma.adminUser.findUnique({ where: { id }, select: { email: true } });
  if (admin?.email === "admin@tcall.uz") return NextResponse.json({ error: "Asosiy adminni o'chirib bo'lmaydi" }, { status: 400 });

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
