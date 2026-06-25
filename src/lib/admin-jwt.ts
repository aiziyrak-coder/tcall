let warnedMissingAdminSecret = false;

export function getAdminJwtSecretBytes() {
  const explicitSecret = process.env.ADMIN_JWT_SECRET;
  if (!explicitSecret && process.env.NODE_ENV === "production" && !warnedMissingAdminSecret) {
    warnedMissingAdminSecret = true;
    console.warn("[admin-auth] ADMIN_JWT_SECRET topilmadi, JWT_SECRET fallback ishlatilmoqda.");
  }

  const fallbackSecret = `${process.env.JWT_SECRET || "dev-admin-fallback"}-admin-2026-tcall`;
  return new TextEncoder().encode(explicitSecret || fallbackSecret);
}
