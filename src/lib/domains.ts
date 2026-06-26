/** Production domenlar — bitta joydan boshqariladi */
export const DEFAULT_LANDING_URL = "https://tcall.uz";
export const DEFAULT_WEB_APP_URL = "https://web.tcall.uz";
export const DEFAULT_API_URL = "https://api.tcall.uz";

/** @deprecated use DEFAULT_LANDING_URL or getWebAppUrl() */
export const DEFAULT_APP_URL = DEFAULT_LANDING_URL;

export const LANDING_HOST = "tcall.uz";
export const WEB_APP_HOST = "web.tcall.uz";
export const API_HOST = "api.tcall.uz";
export const DEFAULT_COOKIE_DOMAIN = ".tcall.uz";

export const LANDING_HOSTS = new Set(["tcall.uz", "www.tcall.uz"]);
export const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function getLandingUrl(): string {
  return process.env.NEXT_PUBLIC_LANDING_URL || DEFAULT_LANDING_URL;
}

export function getWebAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEB_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_WEB_APP_URL
  );
}

/** CORS va cookie fallback — veb-ilova manzili */
export function getPublicAppUrl(): string {
  return getWebAppUrl();
}

export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function normalizeHostname(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

/** Host / X-Forwarded-Host dan hostname */
export function resolveHostname(
  hostHeader: string | null | undefined,
  forwardedHeader: string | null | undefined,
  fallback = "",
): string {
  if (forwardedHeader) {
    const first = forwardedHeader.split(",")[0]?.trim();
    if (first) return normalizeHostname(first);
  }
  if (hostHeader) return normalizeHostname(hostHeader);
  return normalizeHostname(fallback);
}

export function isLandingHost(hostname: string): boolean {
  const h = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(h)) return false;
  return LANDING_HOSTS.has(h);
}

export function isWebAppHost(hostname: string): boolean {
  const h = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(h)) return true;
  if (h === WEB_APP_HOST) return true;
  return h.endsWith(".tcall.uz") && h !== API_HOST && !LANDING_HOSTS.has(h);
}

export function isAppHost(hostname: string): boolean {
  return isLandingHost(hostname) || isWebAppHost(hostname);
}

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(normalizeHostname(hostname));
}

export function getAllowedOrigins(): string[] {
  const landing = getLandingUrl();
  const web = getWebAppUrl();
  const api = getPublicApiUrl();
  return [
    landing,
    web,
    api,
    landing.replace("://", "://www."),
    web.replace("://", "://www."),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter((v, i, a) => a.indexOf(v) === i);
}

/** Landing domenida ruxsat etilgan sahifalar */
export const LANDING_ALLOWED_PATHS = new Set(["/", "/privacy", "/terms"]);

/** Web ilova yo‘llari — landing domenida web.tcall.uz ga yo‘naltiriladi */
export const WEB_APP_PATH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/call",
  "/admin",
] as const;

export function isWebAppPath(pathname: string): boolean {
  return WEB_APP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isLandingStaticPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/downloads/")) return true;
  if (/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/i.test(pathname)) return true;
  return ["/favicon.ico", "/manifest.json", "/sw.js", "/logo.png", "/logo-icon.png"].includes(pathname);
}
