import { toVanityUsdPrice, formatVanityPrice as formatUsd } from "@/lib/vanity-currency";

export type VanityTier =
  | "free"
  | "bronze"
  | "silver"
  | "silver_plus"
  | "silver_plus_plus"
  | "gold"
  | "gold_plus"
  | "gold_plus_plus"
  | "platinum"
  | "platinum_plus"
  | "platinum_plus_plus"
  | "platinum_premium"
  | "platinum_premium_plus"
  | "platinum_premium_plus_plus"
  | "vip";

export interface VanityQuote {
  number: string;
  price: number;
  tier: VanityTier;
  pretty: boolean;
  trailingRun: number;
  leadingRun: number;
}

/** Narxlar so'mda — USD ga toVanityUsdPrice orqali */
const TIER_PRICE_SOM: Record<VanityTier, number> = {
  free: 0,
  bronze: 80_000,
  silver: 220_000,
  silver_plus: 380_000,
  silver_plus_plus: 580_000,
  gold: 850_000,
  gold_plus: 1_200_000,
  gold_plus_plus: 1_750_000,
  platinum: 2_500_000,
  platinum_plus: 3_400_000,
  platinum_plus_plus: 4_600_000,
  platinum_premium: 6_500_000,
  platinum_premium_plus: 8_500_000,
  platinum_premium_plus_plus: 11_000_000,
  vip: 18_000_000,
};

export function runLengthFromEnd(num: string): number {
  if (!num) return 0;
  const d = num[num.length - 1];
  let n = 0;
  for (let i = num.length - 1; i >= 0 && num[i] === d; i--) n++;
  return n;
}

export function runLengthFromStart(num: string): number {
  if (!num) return 0;
  const d = num[0];
  let n = 0;
  for (let i = 0; i < num.length && num[i] === d; i++) n++;
  return n;
}

function baseTierFromTrailing(trailing: number): VanityTier {
  if (trailing >= 9) return "vip";
  if (trailing >= 8) return "platinum_premium";
  if (trailing >= 7) return "platinum";
  if (trailing >= 6) return "gold";
  if (trailing >= 5) return "silver";
  if (trailing >= 4) return "bronze";
  return "free";
}

function isSequentialRun(num: string, minLen = 6): boolean {
  let asc = 1;
  let desc = 1;
  for (let i = 1; i < num.length; i++) {
    const diff = Number(num[i]) - Number(num[i - 1]);
    asc = diff === 1 ? asc + 1 : 1;
    desc = diff === -1 ? desc + 1 : 1;
    if (asc >= minLen || desc >= minLen) return true;
  }
  return false;
}

function isRepeatingPairs(num: string): boolean {
  if (num.length < 6 || num.length % 2 !== 0) return false;
  for (let i = 0; i < num.length; i += 2) {
    if (num[i] !== num[i + 1]) return false;
  }
  return true;
}

function isPalindrome(num: string): boolean {
  return num.length >= 7 && num === num.split("").reverse().join("");
}

function hasAlternatingPattern(num: string): boolean {
  if (num.length < 6) return false;
  const a = num[0];
  const b = num[1];
  if (a === b) return false;
  for (let i = 0; i < num.length; i++) {
    if (num[i] !== (i % 2 === 0 ? a : b)) return false;
  }
  return true;
}

/** Trailing/leading run bo'lmasa ham chiroyli deb hisoblanadigan patternlar */
export function hasSpecialPrettyPattern(number: string): boolean {
  if (runLengthFromEnd(number) >= 4 || runLengthFromStart(number) >= 4) return true;
  return (
    isSequentialRun(number) ||
    isRepeatingPairs(number) ||
    isPalindrome(number) ||
    hasAlternatingPattern(number)
  );
}

function applyPlusVariants(base: VanityTier, trailing: number, leading: number): VanityTier {
  if (base === "vip" || base === "bronze" || base === "free") return base;

  const canPlus = trailing >= 5 && leading >= 3;
  if (!canPlus) return base;

  if (leading >= 4) {
    if (base === "silver") return "silver_plus_plus";
    if (base === "gold") return "gold_plus_plus";
    if (base === "platinum") return "platinum_plus_plus";
    if (base === "platinum_premium") return "platinum_premium_plus_plus";
  }

  if (base === "silver") return "silver_plus";
  if (base === "gold") return "gold_plus";
  if (base === "platinum") return "platinum_plus";
  if (base === "platinum_premium") return "platinum_premium_plus";

  return base;
}

export function classifyVanityNumber(raw: string): VanityQuote | null {
  const number = raw.replace(/\D/g, "");
  if (!/^[1-9]\d{8}$/.test(number)) return null;

  const trailing = runLengthFromEnd(number);
  const leading = runLengthFromStart(number);
  let tier = baseTierFromTrailing(trailing);

  if (tier === "free") {
    if (!hasSpecialPrettyPattern(number)) {
      return { number, price: 0, tier: "free", pretty: false, trailingRun: trailing, leadingRun: leading };
    }
    tier = "bronze";
  } else {
    tier = applyPlusVariants(tier, trailing, leading);
  }

  const priceSom = TIER_PRICE_SOM[tier];
  const price = tier === "free" ? 0 : toVanityUsdPrice(priceSom);

  return {
    number,
    price,
    tier,
    pretty: tier !== "free",
    trailingRun: trailing,
    leadingRun: leading,
  };
}

/** @deprecated use classifyVanityNumber */
export function quoteVanityNumber(raw: string): VanityQuote | null {
  return classifyVanityNumber(raw);
}

export function formatVanityPrice(priceUsd: number, freeLabel = "Bepul"): string {
  if (priceUsd <= 0) return freeLabel;
  return formatUsd(priceUsd);
}

export function formatTierLabel(tier: string, ui: Record<string, string>): string {
  const key = `tier_${tier}` as keyof typeof ui;
  const label = ui[key as string];
  if (typeof label === "string") return label;
  return tier.replace(/_/g, " ");
}

/** Katalog filtri — har chip faqat o'z oilasidagi tierlarni ko'rsatadi */
export const TIER_FILTER_GROUPS: Record<string, VanityTier[]> = {
  bronze: ["bronze"],
  silver: ["silver", "silver_plus", "silver_plus_plus"],
  gold: ["gold", "gold_plus", "gold_plus_plus"],
  platinum: ["platinum", "platinum_plus", "platinum_plus_plus"],
  platinum_premium: ["platinum_premium", "platinum_premium_plus", "platinum_premium_plus_plus"],
  vip: ["vip"],
};

export const CATALOG_TIER_FILTERS = ["all", "bronze", "silver", "gold", "platinum", "platinum_premium", "vip"] as const;

export function tiersForFilter(filter: string): VanityTier[] | null {
  if (filter === "all" || !filter) return null;
  return TIER_FILTER_GROUPS[filter] ?? null;
}

export function allVanityTiers(): VanityTier[] {
  return Object.keys(TIER_PRICE_SOM) as VanityTier[];
}

export { toVanityUsdPrice } from "@/lib/vanity-currency";
