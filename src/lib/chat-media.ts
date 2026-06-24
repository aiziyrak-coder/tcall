export type ChatMediaKind = "image" | "video" | "file";

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/avif",
]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/3gpp",
  "video/3gp",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
]);

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "heic", "heif", "avif"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "3gp", "3gpp", "avi", "mkv", "mpeg", "mpg"]);

export const CHAT_MAX_IMAGE = 15 * 1024 * 1024;
export const CHAT_MAX_VIDEO = 55 * 1024 * 1024;
export const CHAT_MAX_FILE = 25 * 1024 * 1024;

export function fileExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() || name;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function detectChatMediaKind(filename: string, mime?: string | null): ChatMediaKind {
  const normalized = (mime || "").split(";")[0].trim().toLowerCase();
  if (normalized && IMAGE_MIMES.has(normalized)) return "image";
  if (normalized && VIDEO_MIMES.has(normalized)) return "video";

  const ext = fileExtension(filename);
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  return "file";
}

export function resolveChatMime(filename: string, mime?: string | null): string {
  const normalized = (mime || "").split(";")[0].trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream") return normalized;

  const ext = fileExtension(filename);
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    avif: "image/avif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    "3gp": "video/3gpp",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  return map[ext] || normalized || "application/octet-stream";
}

export function maxSizeForKind(kind: ChatMediaKind): number {
  if (kind === "video") return CHAT_MAX_VIDEO;
  if (kind === "image") return CHAT_MAX_IMAGE;
  return CHAT_MAX_FILE;
}

export function sanitizeUploadExt(filename: string, kind: ChatMediaKind): string {
  const ext = fileExtension(filename).replace(/[^a-z0-9]/gi, "").slice(0, 8);
  if (ext) return ext;
  if (kind === "image") return "jpg";
  if (kind === "video") return "mp4";
  return "bin";
}
