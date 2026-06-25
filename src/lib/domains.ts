/** Production domenlar — bitta joydan boshqariladi */
export const DEFAULT_APP_URL = "https://tcall.uz";
export const DEFAULT_API_URL = "https://api.tcall.uz";
export const APP_HOST = "tcall.uz";
export const API_HOST = "api.tcall.uz";
export const DEFAULT_COOKIE_DOMAIN = ".tcall.uz";

export const APP_HOSTS = new Set(["tcall.uz", "www.tcall.uz"]);
export const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function getPublicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
}

export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function isAppHost(hostname: string): boolean {
  return APP_HOSTS.has(hostname) || (hostname.endsWith(".tcall.uz") && hostname !== API_HOST);
}

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname);
}

export function getAllowedOrigins(): string[] {
  const app = getPublicAppUrl();
  const api = getPublicApiUrl();
  return [
    app,
    api,
    app.replace("://", "://www."),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter((v, i, a) => a.indexOf(v) === i);
}
