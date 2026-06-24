import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const sessionSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string(),
  language: z.string(),
  tcallId: z.string().optional(),
  translationMode: z.string().default("text"),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return new TextEncoder().encode(secret || "dev-only-secret");
}

export type SessionPayload = z.infer<typeof sessionSchema>;

function sessionCookieOptions() {
  const domain = process.env.COOKIE_DOMAIN;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (domain ? "none" : "lax") as "none" | "lax" | "strict",
    ...(domain ? { domain } : {}),
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}

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

/** Custom server (tsx) bilan ishlaydi — NextRequest dan cookie o'qish */
export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token = req?.cookies.get("session")?.value;

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("session")?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

/** Response ga session cookie qo'shish — register/login uchun */
export function withSessionCookie<T>(response: NextResponse<T>, token: string): NextResponse<T> {
  response.cookies.set("session", token, sessionCookieOptions());
  return response;
}

export function jsonWithSession(data: unknown, token: string, status = 200) {
  const res = NextResponse.json(data, { status });
  return withSessionCookie(res, token);
}

export function jsonClearSession(data: unknown = { ok: true }) {
  const res = NextResponse.json(data);
  const opts = sessionCookieOptions();
  res.cookies.set("session", "", { ...opts, maxAge: 0 });
  return res;
}

/** @deprecated — jsonWithSession ishlating */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("session", token, sessionCookieOptions());
}

/** @deprecated — jsonClearSession ishlating */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const domain = process.env.COOKIE_DOMAIN;
  cookieStore.delete({ name: "session", path: "/", ...(domain ? { domain } : {}) });
}
