/** Rasm MIME — Telegram WebView bo'sh yoki noto'g'ri type yuborishi mumkin */
export function sniffImageMime(buffer: Buffer, fallback = "image/jpeg"): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 6 && (buffer.toString("ascii", 0, 3) === "GIF" || buffer.toString("ascii", 0, 4) === "GIF8")) {
    return "image/gif";
  }
  return fallback;
}

export function normalizeImageMime(mime: string, buffer: Buffer): string | null {
  const base = (mime || "").toLowerCase().split(";")[0].trim();
  if (base === "image/jpg") return "image/jpeg";
  if (base === "image/jpeg" || base === "image/png" || base === "image/webp" || base === "image/gif") {
    return base;
  }
  if (!base || base === "application/octet-stream") {
    const sniffed = sniffImageMime(buffer);
    if (sniffed) return sniffed;
  }
  return null;
}

export function extForImageMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}
