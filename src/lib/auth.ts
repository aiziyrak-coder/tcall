import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const sessionSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  language: z.string(),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return new TextEncoder().encode(secret || "dev-only-secret");
}

export type SessionPayload = z.infer<typeof sessionSchema>;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const parsed = sessionSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const domain = process.env.COOKIE_DOMAIN;
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: domain ? "none" : "lax",
    ...(domain ? { domain } : {}),
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const domain = process.env.COOKIE_DOMAIN;
  cookieStore.delete({ name: "session", path: "/", ...(domain ? { domain } : {}) });
}
