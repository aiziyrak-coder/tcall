import type { SessionPayload } from "@/lib/auth";

export { ADMIN_TELEGRAM_USERNAME, ADMIN_TELEGRAM_URL } from "@/lib/admin-config";

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminSession(session: SessionPayload | null): boolean {
  if (!session?.email) return false;
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(session.email.toLowerCase());
}
