import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";
import { getAdminJwtSecretBytes } from "@/lib/admin-jwt";

const ADMIN_COOKIE = "admin_session";

export interface AdminSession {
  adminId: string;
  email: string;
  name: string;
  role: string;
}

export async function createAdminToken(payload: AdminSession): Promise<string> {
  return new SignJWT({ ...payload, type: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getAdminJwtSecretBytes());
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecretBytes());
    if (payload.type !== "admin") return null;
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function getAdminSession(req: NextRequest): Promise<AdminSession | null> {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { ADMIN_COOKIE };

/** Server ishga tushganda admin@tcall.uz ni yaratish */
export async function ensureDefaultAdmin() {
  const email = "admin@tcall.uz";
  // Paroli env yoki default (ishlab chiqarish uchun env o'rnatish kerak)
  const password = process.env.DEFAULT_ADMIN_PASSWORD || "Aa.19980912";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    // Muhim: env da yangi parol bo'lsa, yangilab qo'yamiz
    if (process.env.DEFAULT_ADMIN_PASSWORD) {
      const alreadyMatches = await verifyAdminPassword(password, existing.passwordHash);
      if (!alreadyMatches) {
        const newHash = await hashAdminPassword(password);
        await prisma.adminUser.update({
          where: { email },
          data: { passwordHash: newHash },
        });
      }
    }
    return;
  }
  const passwordHash = await hashAdminPassword(password);
  await prisma.adminUser.create({
    data: { email, name: "Super Admin", passwordHash, role: "super_admin" },
  });
  console.log("[admin] Default admin yaratildi:", email);
}
