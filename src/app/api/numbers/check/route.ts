import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quoteVanityNumber, formatVanityPrice } from "@/lib/vanity-pricing";
import { isNumberTaken } from "@/lib/vanity-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`check-number:${session.userId}`, 30, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const raw = body?.number?.toString() || "";
    const quote = quoteVanityNumber(raw);
    if (!quote) {
      return NextResponse.json({ error: "9 xonali raqam kiriting (1-9 bilan boshlanadi)" }, { status: 400 });
    }

    const taken = await isNumberTaken(quote.number);
    const catalog = await prisma.vanityNumber.findUnique({
      where: { number: quote.number },
      select: { price: true, tier: true, available: true },
    });

    const tier = catalog?.tier || quote.tier;
    const price = quote.tier === "free" ? 0 : catalog?.available ? catalog.price : quote.price;

    return NextResponse.json({
      number: quote.number,
      available: !taken,
      taken,
      price,
      tier,
      pretty: quote.pretty,
      priceLabel: formatVanityPrice(price),
      trailingRun: quote.trailingRun,
      leadingRun: quote.leadingRun,
    });
  } catch (e) {
    console.error("Check number error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
