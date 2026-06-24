import { prisma } from "./prisma";
import { toVanityUsdPrice } from "./vanity-currency";

/** Chiroyli raqam patternlari — ro'yxatdan o'tganda berilmaydi */
export function isPrettyNumber(num: string): boolean {
  if (!/^\d{9}$/.test(num)) return false;

  const digits = num.split("").map(Number);

  if (new Set(digits).size <= 2) return true;
  if (/^(\d)\1+$/.test(num)) return true;

  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (asc || desc) return true;

  const palindrome = num === num.split("").reverse().join("");
  if (palindrome) return true;

  if (/(\d{2,3})\1/.test(num)) return true;
  if (/000000|111111|222222|333333|444444|555555|666666|777777|888888|999999/.test(num)) return true;
  if (num.endsWith("000") || num.startsWith("9000000")) return true;

  return false;
}

function randomNineDigit(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const first = (bytes[0] % 9) + 1;
  let rest = "";
  for (let i = 1; i < 9; i++) rest += bytes[i] % 10;
  return `${first}${rest}`;
}

export async function generateUniqueTcallId(): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = randomNineDigit();
    if (isPrettyNumber(candidate)) continue;

    const [userTaken, vanityTaken] = await Promise.all([
      prisma.user.findUnique({ where: { tcallId: candidate }, select: { id: true } }),
      prisma.vanityNumber.findUnique({ where: { number: candidate }, select: { id: true } }),
    ]);

    if (!userTaken && !vanityTaken) return candidate;
  }
  throw new Error("Tcall ID yaratib bo'lmadi");
}

export function formatTcallId(id: string): string {
  const clean = id.replace(/\D/g, "");
  if (clean.length !== 9) return id;
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
}

export const VANITY_SEED: { number: string; price: number; tier: string }[] = [
  { number: "900000001", price: 500000, tier: "platinum" },
  { number: "911111111", price: 999000, tier: "platinum" },
  { number: "922222222", price: 750000, tier: "platinum" },
  { number: "933333333", price: 750000, tier: "platinum" },
  { number: "944444444", price: 720000, tier: "platinum" },
  { number: "955555555", price: 700000, tier: "platinum" },
  { number: "966666666", price: 680000, tier: "platinum" },
  { number: "977777777", price: 660000, tier: "platinum" },
  { number: "988888888", price: 850000, tier: "platinum" },
  { number: "999999999", price: 999000, tier: "platinum" },
  { number: "900123456", price: 350000, tier: "gold" },
  { number: "901234567", price: 450000, tier: "gold" },
  { number: "987654321", price: 450000, tier: "gold" },
  { number: "909090909", price: 300000, tier: "gold" },
  { number: "900000007", price: 250000, tier: "gold" },
  { number: "900000099", price: 200000, tier: "silver" },
  { number: "900001111", price: 180000, tier: "silver" },
  { number: "900111111", price: 220000, tier: "silver" },
  { number: "901010101", price: 150000, tier: "silver" },
  { number: "909999999", price: 280000, tier: "gold" },
  { number: "912345678", price: 320000, tier: "gold" },
  { number: "900888888", price: 600000, tier: "platinum" },
  { number: "900777777", price: 550000, tier: "platinum" },
  { number: "900555555", price: 400000, tier: "gold" },
  { number: "900121212", price: 120000, tier: "silver" },
  { number: "900343434", price: 120000, tier: "silver" },
];

export function generateVanityCatalog(): { number: string; price: number; tier: string }[] {
  const map = new Map<string, { price: number; tier: string }>();

  const add = (number: string, price: number, tier: string) => {
    if (!/^[1-9]\d{8}$/.test(number)) return;
    if (!map.has(number)) map.set(number, { price, tier });
  };

  for (const v of VANITY_SEED) add(v.number, toVanityUsdPrice(v.price), v.tier);

  for (let i = 1; i <= 99; i++) {
    add(`9000000${String(i).padStart(2, "0")}`, toVanityUsdPrice(140_000 + i * 1200), i <= 5 ? "gold" : "silver");
  }

  for (let i = 1; i <= 9; i++) {
    add(`90${i}0000000`, toVanityUsdPrice(190_000 + i * 25_000), "gold");
    add(`90${i}1111111`, toVanityUsdPrice(210_000 + i * 30_000), "gold");
    add(`90${i}9999999`, toVanityUsdPrice(230_000 + i * 28_000), "gold");
  }

  for (let prefix = 900; prefix <= 919; prefix++) {
    for (let d = 0; d <= 9; d++) {
      const tail = String(d).repeat(9 - String(prefix).length);
      add(`${prefix}${tail}`, toVanityUsdPrice(160_000 + d * 18_000), d >= 7 ? "platinum" : "gold");
    }
  }

  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      if (a === b) continue;
      const chunk = `${a}${b}`.repeat(3);
      add(`900${chunk}`, toVanityUsdPrice(115_000), "silver");
      add(`901${chunk}`, toVanityUsdPrice(118_000), "silver");
      add(`902${chunk}`, toVanityUsdPrice(121_000), "silver");
      add(`910${chunk}`, toVanityUsdPrice(125_000), "silver");
    }
  }

  for (let start = 0; start <= 9; start++) {
    const digits: number[] = [];
    for (let i = 0; i < 9; i++) digits.push((start + i) % 10);
    if (digits[0] === 0) continue;
    add(digits.join(""), toVanityUsdPrice(280_000 + start * 15_000), "gold");
  }

  for (let xx = 0; xx <= 99; xx++) {
    add(`900${String(xx).padStart(2, "0")}0000`, toVanityUsdPrice(95_000 + xx * 600), "silver");
    add(`901${String(xx).padStart(2, "0")}0000`, toVanityUsdPrice(98_000 + xx * 600), "silver");
  }

  for (let x = 1; x <= 9; x++) {
    for (let y = 0; y <= 9; y++) {
      add(`90${x}00000${y}`, toVanityUsdPrice(105_000 + x * 2000), "silver");
      add(`90${x}99999${y}`, toVanityUsdPrice(135_000 + x * 2500), "silver");
    }
  }

  for (let i = 0; i <= 999; i++) {
    const mid = String(i).padStart(3, "0");
    const pal = `900${mid[0]}${mid[1]}${mid[2]}${mid[1]}${mid[0]}`;
    if (pal.length === 9 && isPrettyNumber(pal)) add(pal, toVanityUsdPrice(240_000 + (i % 50) * 800), "gold");
  }

  for (let block = 0; block <= 9; block++) {
    add(`90000${block}${block}${block}${block}${block}`, toVanityUsdPrice(150_000 + block * 8000), "silver");
    add(`9000${block}${block}${block}${block}${block}${block}`, toVanityUsdPrice(165_000 + block * 9000), "silver");
  }

  return Array.from(map.entries()).map(([number, meta]) => ({ number, ...meta }));
}

export async function seedVanityNumbers() {
  const catalog = generateVanityCatalog();
  for (const v of catalog) {
    await prisma.vanityNumber.upsert({
      where: { number: v.number },
      create: { number: v.number, price: v.price, tier: v.tier, available: true },
      update: { price: v.price, tier: v.tier },
    });
  }
}
