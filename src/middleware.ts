import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getAdminEmails } from "@/lib/admin";
import { DEFAULT_APP_URL, getAllowedOrigins, getPublicAppUrl } from "@/lib/domains";

const protectedPaths = ["/dashboard", "/call", "/admin"];
const ALLOWED_ORIGINS = getAllowedOrigins();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
  const fallback = getPublicAppUrl() || DEFAULT_APP_URL;
  return {
    "Access-Control-Allow-Origin": allowed || fallback,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tcall-Native",
    "Access-Control-Allow-Credentials": "true",
  };
}

async function verifySessionCookie(token: string): Promise<{ ok: true; email?: string } | { ok: false }> {
  const secret = getJwtSecret();
  if (!secret) return process.env.NODE_ENV !== "production" ? { ok: true } : { ok: false };
  try {
    const { payload } = await jwtVerify(token, secret);
    const email = typeof payload.email === "string" ? payload.email : undefined;
    return { ok: true, email };
  } catch {
    return { ok: false };
  }
}

function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.length > 0 && admins.includes(email.toLowerCase());
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
    }
    const response = NextResponse.next();
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => response.headers.set(k, v));
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySessionCookie(token) : { ok: false as const };
  if (!session.ok) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const res = NextResponse.redirect(loginUrl);
    if (token) res.cookies.delete("session");
    return res;
  }

  if (pathname.startsWith("/admin") && !isAdminEmail(session.email)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/call/:path*", "/admin/:path*"],
};
