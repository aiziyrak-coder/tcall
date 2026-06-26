export type ChatMediaKind = "image" | "video" | "file";

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
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

const AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
]);

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif", "avif"]);
const VIDEO_EXT = new Set(["mp4", "mov", "m4v", "3gp", "3gpp", "avi", "mkv", "mpeg", "mpg"]);
const AUDIO_EXT = new Set(["m4a", "mp3", "ogg", "aac", "wav"]);

export const CHAT_MAX_IMAGE = 15 * 1024 * 1024;
export const CHAT_MAX_VIDEO = 55 * 1024 * 1024;
export const CHAT_MAX_FILE = 25 * 1024 * 1024;
export const CHAT_MAX_AUDIO = 16 * 1024 * 1024;

export function fileExtension(name: string): string {
  const base = name.split(/[/\\]/).pop() || name;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export function isVoiceChatFilename(filename: string): boolean {
  const base = (filename.split(/[/\\]/).pop() || filename).toLowerCase();
  return base.startsWith("voice-") || base.startsWith("audio-");
}

export function isAudioMime(mime?: string | null): boolean {
  const normalized = (mime || "").split(";")[0].trim().toLowerCase();
  return normalized.startsWith("audio/") || AUDIO_MIMES.has(normalized);
}

export function isVideoMime(mime?: string | null): boolean {
  const normalized = (mime || "").split(";")[0].trim().toLowerCase();
  return normalized.startsWith("video/") || VIDEO_MIMES.has(normalized);
}

export function isImageMime(mime?: string | null): boolean {
  const normalized = (mime || "").split(";")[0].trim().toLowerCase();
  return normalized.startsWith("image/") || IMAGE_MIMES.has(normalized);
}

export function isChatAudioMessage(
  type: string,
  mediaMime?: string | null,
  mediaName?: string | null
): boolean {
  if (type === "audio") return true;
  if (isAudioMime(mediaMime)) return true;
  if (type === "file" && mediaName && isVoiceChatFilename(mediaName)) return true;
  if (type === "file" && mediaName && AUDIO_EXT.has(fileExtension(mediaName))) return true;
  return false;
}

export function isChatVideoMessage(
  type: string,
  mediaMime?: string | null,
  mediaName?: string | null
): boolean {
  if (isChatAudioMessage(type, mediaMime, mediaName)) return false;
  if (type === "video") return true;
  if (isVideoMime(mediaMime)) return true;
  if (type === "file" && mediaName && VIDEO_EXT.has(fileExtension(mediaName))) return true;
  return false;
}

export function isChatImageMessage(
  type: string,
  mediaMime?: string | null,
  mediaName?: string | null
): boolean {
  if (type === "image") return true;
  if (isImageMime(mediaMime)) return true;
  if (type === "file" && mediaName && IMAGE_EXT.has(fileExtension(mediaName))) return true;
  return false;
}

export function detectChatMediaKind(filename: string, mime?: string | null): ChatMediaKind {
  if (isVoiceChatFilename(filename) || isAudioMime(mime)) return "file";

  const normalized = (mime || "").split(";")[0].trim().toLowerCase();
  if (normalized && IMAGE_MIMES.has(normalized)) return "image";
  if (normalized && VIDEO_MIMES.has(normalized)) return "video";

  const ext = fileExtension(filename);
  if (AUDIO_EXT.has(ext) && !VIDEO_EXT.has(ext)) return "file";
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (ext === "webm" && isAudioMime(mime)) return "file";
  return "file";
}

export function resolveChatMime(filename: string, mime?: string | null): string {
  const normalized = (mime || "").split(";")[0].trim().toLowerCase();

  if (isVoiceChatFilename(filename) || isAudioMime(normalized)) {
    if (normalized && normalized.startsWith("audio/")) return normalized;
    const ext = fileExtension(filename);
    const audioMap: Record<string, string> = {
      webm: "audio/webm",
      m4a: "audio/mp4",
      mp3: "audio/mpeg",
      ogg: "audio/ogg",
      aac: "audio/aac",
      wav: "audio/wav",
    };
    return audioMap[ext] || "audio/webm";
  }

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
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    aac: "audio/aac",
    wav: "audio/wav",
  };
  return map[ext] || normalized || "application/octet-stream";
}

export function maxSizeForKind(kind: ChatMediaKind, mime?: string | null, filename?: string): number {
  if (isAudioMime(mime) || (filename && isVoiceChatFilename(filename))) return CHAT_MAX_AUDIO;
  if (kind === "video") return CHAT_MAX_VIDEO;
  if (kind === "image") return CHAT_MAX_IMAGE;
  return CHAT_MAX_FILE;
}

export function sanitizeUploadExt(filename: string, kind: ChatMediaKind, mime?: string | null): string {
  const ext = fileExtension(filename).replace(/[^a-z0-9]/gi, "").slice(0, 8);
  if (ext) return ext;
  if (kind === "image") return "jpg";
  if (kind === "video") return "mp4";
  if (isAudioMime(mime) || isVoiceChatFilename(filename)) return "m4a";
  return "bin";
}
