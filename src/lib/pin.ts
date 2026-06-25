import crypto from "crypto";
import { hashPassword, verifyPassword } from "./auth";

export const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

/** distance below which two faces are confidently the same person */
export const FACE_AUTO_MATCH_THRESHOLD = 0.4;
/** distance below which faces are likely the same (shown to admin as a hint) */
export const FACE_LIKELY_THRESHOLD = 0.55;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return hashPassword(pin);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return verifyPassword(pin, hash);
}

// --- In-memory brute-force protection (single long-running server process) ---
interface AttemptState {
  count: number;
  lockedUntil: number;
}
const attempts = new Map<string, AttemptState>();

export function getPinLock(userId: string): { locked: boolean; retryAfterMs: number; attemptsLeft: number } {
  const s = attempts.get(userId);
  const now = Date.now();
  if (!s) return { locked: false, retryAfterMs: 0, attemptsLeft: MAX_ATTEMPTS };
  if (s.lockedUntil > now) {
    return { locked: true, retryAfterMs: s.lockedUntil - now, attemptsLeft: 0 };
  }
  return { locked: false, retryAfterMs: 0, attemptsLeft: Math.max(0, MAX_ATTEMPTS - s.count) };
}

export function recordPinFailure(userId: string): { locked: boolean; retryAfterMs: number; attemptsLeft: number } {
  const now = Date.now();
  const s = attempts.get(userId) ?? { count: 0, lockedUntil: 0 };
  if (s.lockedUntil > now) {
    return { locked: true, retryAfterMs: s.lockedUntil - now, attemptsLeft: 0 };
  }
  s.count += 1;
  if (s.count >= MAX_ATTEMPTS) {
    s.lockedUntil = now + LOCK_MS;
    s.count = 0;
    attempts.set(userId, s);
    return { locked: true, retryAfterMs: LOCK_MS, attemptsLeft: 0 };
  }
  attempts.set(userId, s);
  return { locked: false, retryAfterMs: 0, attemptsLeft: MAX_ATTEMPTS - s.count };
}

export function resetPinAttempts(userId: string): void {
  attempts.delete(userId);
}

// --- Face descriptor helpers (face-api 128-d vectors) ---
export function parseDescriptor(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length >= 64 && arr.every((n) => typeof n === "number")) {
      return arr as number[];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function serializeDescriptor(arr: unknown): string | null {
  if (!Array.isArray(arr) || arr.length < 64) return null;
  const nums = arr.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (nums.length < 64) return null;
  return JSON.stringify(nums.map((n) => Math.round(n * 1e5) / 1e5));
}

export function faceDistance(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length === 0) return null;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function generateResetToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
