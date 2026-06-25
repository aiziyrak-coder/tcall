/**
 * Chiroyli raqam narxlash va tasnif tizimi
 * Narxlar USD da — avvalgi narxlardan 10x arzon
 */

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
  /** Aniqlanган pattern nomi (UI uchun) */
  pattern?: string;
  /** Ball — qanchalik chiroyli (0–100) */
  score: number;
}

/** Narxlar to'g'ridan-to'g'ri USD da (avvalgi narxdan 10x arzon) */
const TIER_PRICE_USD: Record<VanityTier, number> = {
  free:                     0,
  bronze:                   8,
  silver:                   22,
  silver_plus:              38,
  silver_plus_plus:         58,
  gold:                     85,
  gold_plus:                120,
  gold_plus_plus:           175,
  platinum:                 250,
  platinum_plus:            340,
  platinum_plus_plus:       460,
  platinum_premium:         650,
  platinum_premium_plus:    850,
  platinum_premium_plus_plus: 1_100,
  vip:                      1_800,
};

// ──────────────────────────────────────────────
//  Pattern aniqlovchi funksiyalar
// ──────────────────────────────────────────────

/** Oxirdan bir xil raqamlar soni */
export function runLengthFromEnd(num: string): number {
  if (!num) return 0;
  const d = num[num.length - 1];
  let n = 0;
  for (let i = num.length - 1; i >= 0 && num[i] === d; i--) n++;
  return n;
}

/** Boshidan bir xil raqamlar soni */
export function runLengthFromStart(num: string): number {
  if (!num) return 0;
  const d = num[0];
  let n = 0;
  for (let i = 0; i < num.length && num[i] === d; i++) n++;
  return n;
}

/** Eng uzun ketma-ket bir xil raqamlar oralig'i */
function maxInternalRun(num: string): number {
  let max = 1, cur = 1;
  for (let i = 1; i < num.length; i++) {
    if (num[i] === num[i - 1]) { cur++; max = Math.max(max, cur); }
    else cur = 1;
  }
  return max;
}

/** O'sish yoki kamayish ketma-ketligi uzunligi */
function sequenceRunLen(num: string): { len: number; dir: "asc" | "desc" | "none" } {
  let asc = 1, desc = 1, maxAsc = 1, maxDesc = 1;
  for (let i = 1; i < num.length; i++) {
    const diff = Number(num[i]) - Number(num[i - 1]);
    asc  = diff ===  1 ? asc  + 1 : 1;
    desc = diff === -1 ? desc + 1 : 1;
    if (asc  > maxAsc)  maxAsc  = asc;
    if (desc > maxDesc) maxDesc = desc;
  }
  if (maxAsc >= maxDesc) return { len: maxAsc, dir: maxAsc > 1 ? "asc" : "none" };
  return { len: maxDesc, dir: "desc" };
}

/** To'liq palindrom (masalan: 123454321) */
function isPalindrome(num: string): boolean {
  return num === num.split("").reverse().join("");
}

/** Bir xil juftliklar takrorlash (masalan: 112233445) */
function isRepeatingPairs(num: string): boolean {
  if (num.length % 2 !== 0) return false;
  for (let i = 0; i < num.length; i += 2) {
    if (num[i] !== num[i + 1]) return false;
  }
  return true;
}

/** ABABABAB… almashinuvchi pattern */
function hasAlternatingPattern(num: string): boolean {
  if (num.length < 6) return false;
  const a = num[0], b = num[1];
  if (a === b) return false;
  for (let i = 0; i < num.length; i++) {
    if (num[i] !== (i % 2 === 0 ? a : b)) return false;
  }
  return true;
}

/** ABCABCABC… takroriy pattern */
function repeatingSubstringLen(num: string): number {
  for (let pLen = 2; pLen <= num.length / 2; pLen++) {
    if (num.length % pLen !== 0) continue;
    const pat = num.slice(0, pLen);
    let ok = true;
    for (let i = pLen; i < num.length; i += pLen) {
      if (num.slice(i, i + pLen) !== pat) { ok = false; break; }
    }
    if (ok) return pLen;
  }
  return 0;
}

/** 100…000 shaklidagi dumaloq raqam */
function isRoundNumber(num: string): boolean {
  // Ko'pi bilan bitta nolmas raqam, qolganlari 0
  const nonZero = num.replace(/0/g, "").length;
  return nonZero === 1 && num.includes("0");
}

/** Mirror: ABCCBA yoki ABCBA markaziy simmetriya */
function hasMirrorHalf(num: string): boolean {
  const half = Math.floor(num.length / 2);
  const left = num.slice(0, half);
  const right = num.slice(num.length - half);
  return left === right.split("").reverse().join("");
}

// ──────────────────────────────────────────────
//  Asosiy scoring va tasnif (memoized)
// ──────────────────────────────────────────────

interface PatternResult {
  score: number;
  tier: VanityTier;
  pattern?: string;
}

// O'zgarmas tahlil natijalarini keshlash
const analysisCache = new Map<string, PatternResult>();

function cache(num: string, r: PatternResult): PatternResult {
  analysisCache.set(num, r);
  return r;
}

/** Raqamni to'liq tahlil qilish — ball va tier qaytaradi (memoized) */
function analyzeNumber(num: string): PatternResult {
  if (analysisCache.has(num)) return analysisCache.get(num)!;

  const trailing = runLengthFromEnd(num);
  const leading  = runLengthFromStart(num);
  const internal = maxInternalRun(num);
  const len = num.length; // 9

  // ——— Barcha raqamlar bir xil: 111111111, 999999999
  if (trailing === len) {
    return cache(num, { score: 100, tier: "vip", pattern: `${num[0].repeat(len)}` });
  }

  // ——— Ketma-ket barcha raqamlar: 123456789, 987654321
  const seq = sequenceRunLen(num);
  if (seq.len === len) return cache(num, { score: 98, tier: "vip", pattern: seq.dir === "asc" ? "123456789" : "987654321" });
  if (trailing === 8) return cache(num, { score: 95, tier: "platinum_premium_plus_plus", pattern: `trailing×8` });
  if (leading  === 8) return cache(num, { score: 93, tier: "platinum_premium_plus", pattern: `leading×8` });
  if (trailing === 7) return cache(num, { score: 88, tier: leading >= 3 ? "platinum_plus_plus" : "platinum", pattern: `trailing×7` });
  if (leading  === 7) return cache(num, { score: 85, tier: "platinum_premium", pattern: `leading×7` });
  if (isPalindrome(num)) return cache(num, { score: 82, tier: "platinum_plus", pattern: "palindrome" });
  if (trailing === 6) return cache(num, { score: 78, tier: leading >= 3 ? "gold_plus_plus" : "gold", pattern: `trailing×6` });
  if (leading  === 6) return cache(num, { score: 75, tier: "gold_plus", pattern: `leading×6` });
  if (seq.len >= 7)   return cache(num, { score: 72, tier: "gold_plus", pattern: `seq×${seq.len}` });

  const repLen = repeatingSubstringLen(num);
  if (repLen === 3) return cache(num, { score: 70, tier: "gold", pattern: `repeat${num.slice(0, 3)}` });
  if (trailing === 5) return cache(num, { score: 62, tier: leading >= 3 ? "silver_plus_plus" : "silver", pattern: `trailing×5` });
  if (leading  === 5) return cache(num, { score: 60, tier: "silver_plus", pattern: `leading×5` });
  if (seq.len >= 6)   return cache(num, { score: 58, tier: "silver_plus", pattern: `seq×${seq.len}` });
  if (isRepeatingPairs(num))  return cache(num, { score: 55, tier: "silver", pattern: "pairs" });
  if (hasAlternatingPattern(num)) return cache(num, { score: 52, tier: "silver", pattern: "alternating" });
  if (hasMirrorHalf(num)) return cache(num, { score: 48, tier: "silver", pattern: "mirror" });
  if (repLen === 2)   return cache(num, { score: 45, tier: "bronze", pattern: `repeat${num.slice(0, 2)}` });
  if (isRoundNumber(num)) return cache(num, { score: 42, tier: "bronze", pattern: "round" });
  if (trailing >= 4)  return cache(num, { score: 38, tier: "bronze", pattern: `trailing×${trailing}` });
  if (leading  >= 4)  return cache(num, { score: 35, tier: "bronze", pattern: `leading×${leading}` });
  if (internal >= 5)  return cache(num, { score: 32, tier: "bronze", pattern: `run×${internal}` });
  if (seq.len >= 5)   return cache(num, { score: 30, tier: "bronze", pattern: `seq×${seq.len}` });

  return cache(num, { score: 0, tier: "free", pattern: undefined });
}

// ──────────────────────────────────────────────
//  Tashqi API
// ──────────────────────────────────────────────

export function classifyVanityNumber(raw: string): VanityQuote | null {
  const number = raw.replace(/\D/g, "");
  if (!/^[1-9]\d{8}$/.test(number)) return null;

  const trailing = runLengthFromEnd(number);
  const leading  = runLengthFromStart(number);
  const { score, tier, pattern } = analyzeNumber(number);
  const price = TIER_PRICE_USD[tier] ?? 0;

  return {
    number,
    price,
    tier,
    pretty: tier !== "free",
    trailingRun: trailing,
    leadingRun:  leading,
    pattern,
    score,
  };
}

/** @deprecated use classifyVanityNumber */
export function quoteVanityNumber(raw: string): VanityQuote | null {
  return classifyVanityNumber(raw);
}

export function formatVanityPrice(priceUsd: number, freeLabel = "Bepul"): string {
  if (priceUsd <= 0) return freeLabel;
  return `$${priceUsd.toLocaleString("en-US")}`;
}

export function formatTierLabel(tier: string, ui: Record<string, string>): string {
  const key = `tier_${tier}`;
  const label = ui[key];
  if (typeof label === "string") return label;
  return tier.replace(/_/g, " ");
}

export function hasSpecialPrettyPattern(number: string): boolean {
  return classifyVanityNumber(number)?.pretty ?? false;
}

/** Katalog filtri */
export const TIER_FILTER_GROUPS: Record<string, VanityTier[]> = {
  bronze:           ["bronze"],
  silver:           ["silver", "silver_plus", "silver_plus_plus"],
  gold:             ["gold", "gold_plus", "gold_plus_plus"],
  platinum:         ["platinum", "platinum_plus", "platinum_plus_plus"],
  platinum_premium: ["platinum_premium", "platinum_premium_plus", "platinum_premium_plus_plus"],
  vip:              ["vip"],
};

export const CATALOG_TIER_FILTERS = ["all", "bronze", "silver", "gold", "platinum", "platinum_premium", "vip"] as const;

export function tiersForFilter(filter: string): VanityTier[] | null {
  if (filter === "all" || !filter) return null;
  return TIER_FILTER_GROUPS[filter] ?? null;
}

export function allVanityTiers(): VanityTier[] {
  return Object.keys(TIER_PRICE_USD) as VanityTier[];
}

/** Narxni USD da qaytaradi (vanity-currency o'rniga to'g'ridan-to'g'ri) */
export function toVanityUsdPrice(tier: VanityTier): number {
  return TIER_PRICE_USD[tier] ?? 0;
}

export { formatVanityPrice as formatVanityPriceUsd };
