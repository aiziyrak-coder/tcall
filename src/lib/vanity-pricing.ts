import { isPrettyNumber } from "@/lib/tcallId";

export type VanityTier = "platinum" | "gold" | "silver" | "standard";

export interface VanityQuote {
  number: string;
  price: number;
  tier: VanityTier;
  pretty: boolean;
}

const TIER_BASE: Record<VanityTier, number> = {
  platinum: 550000,
  gold: 280000,
  silver: 140000,
  standard: 90000,
};

function scorePattern(num: string): number {
  const digits = num.split("").map(Number);
  let score = 0;

  if (new Set(digits).size <= 2) score += 40;
  if (/^(\d)\1+$/.test(num)) score += 50;
  if (num === num.split("").reverse().join("")) score += 35;

  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (asc || desc) score += 30;

  if (/(\d{2,3})\1/.test(num)) score += 20;
  if (/000000|111111|222222|333333|444444|555555|666666|777777|888888|999999/.test(num)) score += 45;
  if (num.endsWith("000000") || num.endsWith("00000")) score += 25;
  if (/^900/.test(num)) score += 10;
  if (/^90\d000000/.test(num)) score += 15;

  return score;
}

export function tierFromScore(score: number, pretty: boolean): VanityTier {
  if (!pretty) return "standard";
  if (score >= 45) return "platinum";
  if (score >= 28) return "gold";
  return "silver";
}

export function quoteVanityNumber(raw: string): VanityQuote | null {
  const number = raw.replace(/\D/g, "");
  if (!/^[1-9]\d{8}$/.test(number)) return null;

  const pretty = isPrettyNumber(number);
  const score = scorePattern(number);
  const tier = tierFromScore(score, pretty);
  const base = TIER_BASE[tier];

  let price = base;
  if (pretty) {
    price += Math.min(score * 2500, 450000);
  }

  const lastDigit = Number(number.slice(-1));
  price += lastDigit * 1200;

  return { number, price: Math.round(price / 1000) * 1000, tier, pretty };
}

export function formatVanityPrice(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M so'm`;
  return `${Math.round(price / 1000)}k so'm`;
}
