import { prisma } from "./prisma";
import { classifyVanityNumber, type VanityTier } from "./vanity-pricing";

/** Chiroyli raqam patternlari — ro'yxatdan o'tganda berilmaydi */
export function isPrettyNumber(num: string): boolean {
  const q = classifyVanityNumber(num);
  return !!q?.pretty;
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

function buildPrefix(plen: number, seed: number, digit: number): string {
  let prefix = String(1 + (seed % 9));
  while (prefix.length < plen) {
    prefix += String((seed + prefix.length * 3 + digit) % 10);
  }
  prefix = prefix.slice(0, plen);
  if (prefix[0] === "0") prefix = "1" + prefix.slice(1);
  return prefix;
}

/** Har tier uchun yetarli raqamlar — classifyVanityNumber bilan tasdiqlangan */
export function generateVanityCatalog(): { number: string; price: number; tier: string }[] {
  const seen = new Set<string>();
  const map = new Map<string, { price: number; tier: VanityTier }>();

  const tryAdd = (num: string) => {
    if (!/^[1-9]\d{8}$/.test(num) || seen.has(num)) return;
    seen.add(num);
    const q = classifyVanityNumber(num);
    if (!q || q.tier === "free") return;
    map.set(num, { price: q.price, tier: q.tier });
  };

  for (let d = 1; d <= 9; d++) tryAdd(String(d).repeat(9));

  for (let d = 0; d <= 9; d++) {
    for (let trail = 4; trail <= 8; trail++) {
      const suffix = String(d).repeat(trail);
      const plen = 9 - trail;

      for (let v = 0; v < 180; v++) {
        tryAdd(buildPrefix(plen, v, d) + suffix);
      }

      if (plen >= 3) {
        for (let lead = 1; lead <= 9; lead++) {
          tryAdd(String(lead).repeat(plen) + suffix);
          for (let mid = 0; mid < 12; mid++) {
            let p = String(lead).repeat(Math.max(1, plen - 2));
            while (p.length < plen - 1) p += String((mid + p.length) % 10);
            if (p.length >= plen - 1) {
              tryAdd(p.slice(0, plen - 1) + String(d) + suffix.slice(1));
            }
          }
        }
      }
    }
  }

  const extras = [
    "901234567", "987654321", "912345678", "909090909", "901010101",
    "900123456", "911223344", "900888888", "900777777", "900555555",
    "911111111", "922222222", "933333333", "944444444", "955555555",
    "966666666", "977777777", "988888888", "999999999", "111111111",
    "122222222", "133333333", "144444444", "155555555", "166666666",
    "177777777", "188888888", "199999999", "111111112", "222222221",
  ];
  for (const n of extras) tryAdd(n);

  return Array.from(map.entries())
    .map(([number, meta]) => ({ number, ...meta }))
    .sort((a, b) => a.price - b.price || a.number.localeCompare(b.number));
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
