/** User-Agent va IP asosida qurilma va taxminiy joylashuvni aniqlash (admin uchun) */

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: "mobile" | "tablet" | "desktop" | "app" | "unknown";
  isNativeApp: boolean;
  raw: string;
}

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  const raw = ua || "";
  const s = raw.toLowerCase();

  const isNativeApp = s.includes("tcall") || s.includes("capacitor") || s.includes("wv)") || s.includes("; wv");

  // OS
  let os = "Noma'lum";
  if (/android/.test(s)) os = "Android";
  else if (/iphone|ipad|ipod|ios/.test(s)) os = "iOS";
  else if (/windows nt/.test(s)) os = "Windows";
  else if (/mac os x|macintosh/.test(s)) os = "macOS";
  else if (/linux/.test(s)) os = "Linux";

  // Browser
  let browser = "Noma'lum";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/chrome\//.test(s) && !/edg\//.test(s)) browser = "Chrome";
  else if (/firefox\//.test(s)) browser = "Firefox";
  else if (/safari\//.test(s) && !/chrome\//.test(s)) browser = "Safari";

  // Device type
  let deviceType: DeviceInfo["deviceType"] = "unknown";
  if (isNativeApp) deviceType = "app";
  else if (/ipad|tablet/.test(s)) deviceType = "tablet";
  else if (/mobi|android|iphone/.test(s)) deviceType = "mobile";
  else if (os !== "Noma'lum") deviceType = "desktop";

  return { browser, os, deviceType, isNativeApp, raw };
}

export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  isp: string | null;
}

/** IP bo'yicha taxminiy joylashuv (bepul ipwho.is, best-effort) */
export async function lookupIpLocation(ip: string | null | undefined): Promise<GeoInfo | null> {
  if (!ip) return null;
  const clean = ip.split(",")[0].trim();
  // Mahalliy/ichki IP larni o'tkazib yuboramiz
  if (!clean || clean === "127.0.0.1" || clean === "::1" || clean.startsWith("10.") || clean.startsWith("192.168.") || clean.startsWith("172.")) {
    return null;
  }
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(clean)}?fields=success,country,region,city,latitude,longitude,connection`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (d?.success === false) return null;
    return {
      country: d.country ?? null,
      region: d.region ?? null,
      city: d.city ?? null,
      lat: typeof d.latitude === "number" ? d.latitude : null,
      lon: typeof d.longitude === "number" ? d.longitude : null,
      isp: d.connection?.isp ?? null,
    };
  } catch {
    return null;
  }
}
