import {
  getPublicApiUrl,
  getPublicAppUrl,
  isAppHost,
  isLocalHost,
} from "@/lib/domains";

/** Frontend URL (public site) */
export function getAppUrl(): string {
  return getPublicAppUrl();
}

/** Frontend tcall.uz → API api.tcall.uz; localhost → same-origin */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (isLocalHost(host)) return "";
    if (host === "api.tcall.uz") return "";
    if (isAppHost(host)) return getPublicApiUrl();
    return getPublicApiUrl();
  }
  return getPublicApiUrl();
}

export function apiUrl(path: string): string {
  const base = getApiUrl();
  return base ? `${base}${path}` : path;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (
    typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.()
  ) {
    headers.set("X-Tcall-Native", "1");
  }
  return fetch(apiUrl(path), { ...init, headers, credentials: "include" });
}

/** API javobini xavfsiz JSON ga aylantirish — HTML xato sahifalarini ushlaydi */
export async function parseApiJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 120);
    throw new Error(preview || `Server xatosi (${res.status})`);
  }
}

export function getSocketUrl(): string | undefined {
  const api = getApiUrl();
  return api || undefined;
}
