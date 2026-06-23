import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/call"];
const ALLOWED_ORIGINS = [
  "https://tcall.vizara.uz",
  "https://tcallapi.vizara.uz",
  "http://localhost:3000",
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
    }
    const response = NextResponse.next();
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get("session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/call/:path*"],
};
