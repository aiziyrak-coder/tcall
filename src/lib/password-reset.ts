import { createHash, randomInt } from "crypto";
import { getPublicAppUrl } from "@/lib/domains";

const CODE_TTL_MS = 15 * 60 * 1000;

export function generateResetCode(): string {
  return String(randomInt(100000, 999999));
}

export function hashResetCode(code: string, userId: string): string {
  const secret = process.env.JWT_SECRET || "dev-only-secret";
  return createHash("sha256").update(`${code}:${userId}:${secret}`).digest("hex");
}

export function verifyResetCode(code: string, userId: string, codeHash: string): boolean {
  return hashResetCode(code, userId) === codeHash;
}

export function resetCodeExpiresAt(): Date {
  return new Date(Date.now() + CODE_TTL_MS);
}

export function buildResetUrl(code: string, email: string): string {
  const base = getPublicAppUrl();
  const params = new URLSearchParams({ email, code });
  return `${base}/reset-password?${params.toString()}`;
}
