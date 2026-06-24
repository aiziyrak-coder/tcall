import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const ROOM_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_ID_LENGTH = 8;

/** Cryptographically secure room ID (server-side API routes only). */
export function generateRoomId(): string {
  const bytes = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_ID_CHARS[b % ROOM_ID_CHARS.length]).join("");
}

export function isValidRoomId(roomId: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(roomId.toUpperCase());
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
