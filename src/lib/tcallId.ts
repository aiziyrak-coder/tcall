import { prisma } from "./prisma";
import { classifyVanityNumber } from "./vanity-pricing";

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

/** Katalog — har tier uchun namunaviy raqamlar (cheklangan) */
export function generateVanityCatalog(): { number: string; price: number; tier: string }[] {
  const seen = new Set<string>();
  const map = new Map<string, { price: number; tier: string }>();

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

      for (let v = 0; v < 24; v++) {
        let prefix = String(1 + (v % 9));
        while (prefix.length < plen) prefix += String((v + prefix.length + d) % 10);
        prefix = prefix.slice(0, plen);
        if (prefix[0] === "0") prefix = "1" + prefix.slice(1);
        tryAdd(prefix + suffix);
      }

      if (plen >= 3) {
        for (let lead = 1; lead <= 9; lead++) {
          tryAdd(String(lead).repeat(plen) + suffix);
        }
      }
    }
  }

  const extras = [
    "901234567", "987654321", "912345678", "909090909", "901010101",
    "900123456", "911223344", "900888888", "900777777", "900555555",
  ];
  for (const n of extras) tryAdd(n);

  return Array.from(map.entries())
    .map(([number, meta]) => ({ number, ...meta }))
    .sort((a, b) => a.price - b.price);
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
