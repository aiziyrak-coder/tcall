/** Chiroyli raqam narxlari — USD (100× so'm, kurs bo'yicha) */

export const VANITY_PRICE_MULTIPLIER = 100;
export const UZS_PER_USD = 10_000;

export function roundVanityUsd(usd: number): number {
  if (usd <= 0) return 0;
  let rounded: number;
  if (usd >= 50_000) rounded = Math.round(usd / 5_000) * 5_000;
  else if (usd >= 10_000) rounded = Math.round(usd / 1_000) * 1_000;
  else if (usd >= 1_000) rounded = Math.round(usd / 500) * 500;
  else rounded = Math.round(usd / 100) * 100;
  return Math.max(500, rounded);
}

export function toVanityUsdPrice(somBase: number): number {
  const raw = (somBase * VANITY_PRICE_MULTIPLIER) / UZS_PER_USD;
  return roundVanityUsd(raw);
}

export function formatVanityPrice(priceUsd: number): string {
  return `$${priceUsd.toLocaleString("en-US")}`;
}
