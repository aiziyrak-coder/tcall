import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyAdminPassword,
  createAdminToken,
  getAdminSession,
  ADMIN_COOKIE,
  ensureDefaultAdmin,
} from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(`admin-login:${req.headers.get("x-forwarded-for") || "local"}`, 10, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });

  try {
    await ensureDefaultAdmin();
    const { email, password } = loginSchema.parse(await req.json());
    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin) return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 });

    const ok = await verifyAdminPassword(password, admin.passwordHash);
    if (!ok) return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 });

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    const token = await createAdminToken({ adminId: admin.id, email: admin.email, name: admin.name, role: admin.role });

    const res = NextResponse.json({ ok: true, admin: { email: admin.email, name: admin.name, role: admin.role } });
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const isHttps = req.nextUrl.protocol === "https:" || forwardedProto === "https";
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 86400,
      path: "/",
    });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, admin: session });
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
