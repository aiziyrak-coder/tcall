/** Frontend URL (public site) */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

/** Backend API URL — production da tcallapi.vizara.uz */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
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
  const url = getApiUrl();
  return url || undefined;
}
