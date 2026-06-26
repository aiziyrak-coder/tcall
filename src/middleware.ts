import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  DEFAULT_WEB_APP_URL,
  getAllowedOrigins,
  getWebAppUrl,
  isLandingHost,
  isLandingStaticPath,
  LANDING_ALLOWED_PATHS,
  resolveHostname,
} from "@/lib/domains";
import { getAdminJwtSecretBytes } from "@/lib/admin-jwt";

const protectedPaths = ["/dashboard", "/call", "/admin"];
const ALLOWED_ORIGINS = getAllowedOrigins();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : null;
  const fallback = getWebAppUrl() || DEFAULT_WEB_APP_URL;
  return {
    "Access-Control-Allow-Origin": allowed || fallback,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tcall-Native",
    "Access-Control-Allow-Credentials": "true",
  };
}

async function verifySessionCookie(token: string): Promise<{ ok: true; email?: string } | { ok: false }> {
  const secret = getJwtSecret();
  if (!secret) return { ok: false };
  try {
    const { payload } = await jwtVerify(token, secret);
    const email = typeof payload.email === "string" ? payload.email : undefined;
    return { ok: true, email };
  } catch {
    return { ok: false };
  }
}

async function verifyAdminCookie(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecretBytes());
    return payload.type === "admin";
  } catch {
    return false;
  }
}

function securityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function redirectToWebApp(request: NextRequest): NextResponse {
  const webBase = getWebAppUrl();
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, webBase);
  return securityHeaders(NextResponse.redirect(target, 308));
}

function requestHostname(request: NextRequest): string {
  return resolveHostname(
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    request.nextUrl.hostname,
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = requestHostname(request);

  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    if (request.method === "OPTIONS") {
      return securityHeaders(new NextResponse(null, { status: 204, headers: corsHeaders(origin) }));
    }
    const response = NextResponse.next();
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => response.headers.set(k, v));
    return securityHeaders(response);
  }

  // tcall.uz — faqat marketing landing, yuklab olish, legal
  if (isLandingHost(hostname)) {
    if (LANDING_ALLOWED_PATHS.has(pathname) || isLandingStaticPath(pathname)) {
      return securityHeaders(NextResponse.next());
    }
    return redirectToWebApp(request);
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return securityHeaders(NextResponse.next());

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return securityHeaders(NextResponse.next());
    const adminToken = request.cookies.get("admin_session")?.value;
    if (!adminToken || !(await verifyAdminCookie(adminToken))) {
      return securityHeaders(NextResponse.redirect(new URL("/admin/login", request.url)));
    }
    return securityHeaders(NextResponse.next());
  }

  const token = request.cookies.get("session")?.value;
  const session = token ? await verifySessionCookie(token) : { ok: false as const };
  if (!session.ok) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const res = securityHeaders(NextResponse.redirect(loginUrl));
    if (token) res.cookies.delete("session");
    return res;
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/",
    "/api/:path*",
    "/dashboard/:path*",
    "/call/:path*",
    "/admin/:path*",
    "/admin/login",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/privacy",
    "/terms",
    "/downloads/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)",
  ],
};
