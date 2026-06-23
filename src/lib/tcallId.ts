import { prisma } from "./prisma";

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
  const first = Math.floor(Math.random() * 9) + 1;
  let rest = "";
  for (let i = 0; i < 8; i++) rest += Math.floor(Math.random() * 10);
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

export async function seedVanityNumbers() {
  for (const v of VANITY_SEED) {
    await prisma.vanityNumber.upsert({
      where: { number: v.number },
      create: { number: v.number, price: v.price, tier: v.tier, available: true },
      update: {},
    });
  }
}
