/** Frontend URL (public site) */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

/** Production da frontend domeni orqali same-origin proxy (WebSocket/CORS muammosiz) */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "tcall.vizara.uz" || host === "localhost" || host === "127.0.0.1") {
      return "";
    }
    return process.env.NEXT_PUBLIC_API_URL || "";
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || "";
}

export function apiUrl(path: string): string {
  const base = getApiUrl();
  return base ? `${base}${path}` : path;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), { ...init, credentials: "include" });
}

export function getSocketUrl(): string | undefined {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "tcall.vizara.uz" || host === "localhost" || host === "127.0.0.1") {
      return undefined;
    }
  }
  const url = getApiUrl();
  return url || undefined;
}
