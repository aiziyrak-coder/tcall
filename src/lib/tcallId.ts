import { prisma } from "./prisma";
import { classifyVanityNumber, type VanityTier } from "./vanity-pricing";

/** Chiroyli raqam patternlari — ro'yxatdan o'tganda berilmaydi */
export function isPrettyNumber(num: string): boolean {
  const number = num.replace(/\D/g, "");
  if (!/^[1-9]\d{8}$/.test(number)) return false;
  const q = classifyVanityNumber(number);
  return !!q && q.tier !== "free";
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

  // ——— VIP: barcha bir xil + to'liq ketma-ket
  for (let d = 1; d <= 9; d++) tryAdd(String(d).repeat(9));
  tryAdd("123456789"); // to'liq o'sish
  tryAdd("987654321"); // to'liq kamayish
  tryAdd("234567891");
  tryAdd("345678912");

  // ——— Trailing va leading runlar (4–8 ta)
  for (let d = 0; d <= 9; d++) {
    for (let trail = 4; trail <= 8; trail++) {
      const suffix = String(d).repeat(trail);
      const plen = 9 - trail;

      for (let v = 0; v < 200; v++) {
        tryAdd(buildPrefix(plen, v, d) + suffix);
      }

      if (plen >= 2) {
        for (let lead = 1; lead <= 9; lead++) {
          tryAdd(String(lead).repeat(Math.min(plen, 4)) + suffix.padStart(9 - Math.min(plen, 4), String(d)));
          tryAdd(String(lead).repeat(plen) + suffix);
        }
      }
    }
  }

  // ——— Palindromlar (9 xona): ABCDEDCBA
  for (let a = 1; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      for (let c = 0; c <= 9; c++) {
        for (let e = 0; e <= 9; e++) {
          // ABCDEДCBA: a b c d e d c b a
          for (let dd = 0; dd <= 9; dd++) {
            const pal = `${a}${b}${c}${dd}${e}${dd}${c}${b}${a}`;
            if (/^[1-9]\d{8}$/.test(pal)) tryAdd(pal);
          }
        }
      }
    }
  }

  // ——— Almashinuvchi patternlar: ABABABABА
  for (let a = 1; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      if (a === b) continue;
      const alt = (a + "" + b).repeat(5).slice(0, 9);
      if (/^[1-9]\d{8}$/.test(alt)) tryAdd(alt);
    }
  }

  // ——— Takroriy 3 xonali blok: 123123123
  for (let a = 1; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      for (let c = 0; c <= 9; c++) {
        const rep = `${a}${b}${c}`.repeat(3);
        if (/^[1-9]\d{8}$/.test(rep)) tryAdd(rep);
      }
    }
  }

  // ——— Dumaloq raqamlar: 100000000, 200000000...
  for (let d = 1; d <= 9; d++) {
    tryAdd(d + "00000000");
    tryAdd(d + "10000000");
    tryAdd(d + "50000000");
    tryAdd(d + "00000001");
  }

  // ——— Juft-juft: 112233445 → to'liq juftlar
  for (let a = 1; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      for (let c = 0; c <= 9; c++) {
        for (let d = 0; d <= 9; d++) {
          // 8 xona: aabbccdd + nima?
          if (a !== b || b === c) {
            const pairs = `${a}${a}${b}${b}${c}${c}${d}${d}`;
            // 8 xona, 1 qo'shib 9 ga
            if (/^\d{8}$/.test(pairs)) {
              for (let x = 1; x <= 9; x++) {
                const n = x + pairs;
                if (/^[1-9]\d{8}$/.test(n)) tryAdd(n);
              }
            }
          }
        }
      }
    }
  }

  // ——— Maxsus sevimlil raqamlar
  const specials = [
    "900000000", "901234567", "912345678", "123456789", "987654321",
    "123123123", "456456456", "789789789", "121212121", "131313131",
    "141414141", "151515151", "212121212", "313131313", "414141414",
    "123321123", "321123321", "456654456", "789987789",
    "111111119", "111111118", "111111117", "222222221", "333333331",
    "100000001", "200000002", "300000003", "400000004", "500000005",
    "600000006", "700000007", "800000008", "900000009",
    "112233445", "556677889", "998877665", "123456780",
    "900111111", "901111111", "911111110", "990000009",
    "100100100", "200200200", "123123124", "987987987",
  ];
  for (const n of specials) tryAdd(n);

  return Array.from(map.entries())
    .map(([number, meta]) => ({ number, ...meta }))
    .sort((a, b) => a.price - b.price || a.number.localeCompare(b.number));
}

export async function seedVanityNumbers() {
  const catalog = generateVanityCatalog();
  // Narxlarni ham yangilaymiz (yangi tizim uchun)
  for (const v of catalog) {
    await prisma.vanityNumber.upsert({
      where: { number: v.number },
      create: { number: v.number, price: v.price, tier: v.tier, available: true },
      update: { price: v.price, tier: v.tier },
    });
  }
}

