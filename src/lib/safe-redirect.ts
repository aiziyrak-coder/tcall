/** Xavfsiz ichki redirect — open redirect oldini olish */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(path)) return fallback;
  return path;
}
