import {
  getPublicApiUrl,
  getPublicAppUrl,
  isLocalHost,
  isWebAppHost,
} from "@/lib/domains";
import { fetchWithRetry } from "@/lib/network-resilience";
import { readCachedToken } from "@/lib/auth-cache";

/** Frontend URL (public site) */
export function getAppUrl(): string {
  return getPublicAppUrl();
}

/** web.tcall.uz va localhost — same-origin (/api nginx orqali); faqat landing api.tcall.uz */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (isLocalHost(host)) return "";
    if (host === "api.tcall.uz") return "";
    if (isWebAppHost(host)) return "";
    return getPublicApiUrl();
  }
  return getPublicApiUrl();
}

export function apiUrl(path: string): string {
  const base = getApiUrl();
  return base ? `${base}${path}` : path;
}

function isNativeClient(): boolean {
  if (typeof window === "undefined") return false;
  const tn = (window as unknown as { TcallNative?: { isAndroid?: boolean } }).TcallNative;
  if (tn?.isAndroid) return true;
  return window.Capacitor?.isNativePlatform?.() === true;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (isNativeClient()) {
    headers.set("X-Tcall-Native", "1");
  }
  const token = readCachedToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetchWithRetry(apiUrl(path), { ...init, headers, credentials: "include" });
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
