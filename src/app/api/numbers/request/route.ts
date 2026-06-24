import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_TELEGRAM_USERNAME, ADMIN_TELEGRAM_URL } from "@/lib/admin-config";
import { quoteVanityNumber } from "@/lib/vanity-pricing";
import { getUserVanityState, isNumberTaken } from "@/lib/vanity-service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`vanity-request:${session.userId}`, 8, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const numberId = body?.numberId?.toString();
    const rawNumber = body?.number?.toString();

    const { owned, pendingRequest } = await getUserVanityState(session.userId);
    if (owned) {
      return NextResponse.json({ error: "Sizda allaqachon chiroyli raqam bor" }, { status: 400 });
    }
    if (pendingRequest) {
      return NextResponse.json(
        { error: "Sizda kutilayotgan so'rov bor — admin tasdiqlashini kuting" },
        { status: 400 }
      );
    }

    let number = "";
    let price = 0;
    let tier = "silver";
    let vanityNumberId: string | null = null;

    if (numberId) {
      const vanity = await prisma.vanityNumber.findUnique({ where: { id: numberId } });
      if (!vanity || !vanity.available) {
        return NextResponse.json({ error: "Raqam band yoki mavjud emas" }, { status: 409 });
      }
      number = vanity.number;
      price = vanity.price;
      tier = vanity.tier;
      vanityNumberId = vanity.id;
    } else if (rawNumber) {
      const quote = quoteVanityNumber(rawNumber);
      if (!quote) {
        return NextResponse.json({ error: "9 xonali raqam kiriting" }, { status: 400 });
      }
      number = quote.number;
      price = quote.price;
      tier = quote.tier;

      const catalog = await prisma.vanityNumber.findUnique({ where: { number } });
      if (catalog?.available) {
        price = catalog.price;
        tier = catalog.tier;
        vanityNumberId = catalog.id;
      }
    } else {
      return NextResponse.json({ error: "Raqam tanlanmagan" }, { status: 400 });
    }

    if (await isNumberTaken(number)) {
      return NextResponse.json({ error: "Raqam band" }, { status: 409 });
    }

    const request = await prisma.vanityNumberRequest.create({
      data: {
        userId: session.userId,
        number,
        price,
        tier,
        vanityNumberId,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      request: {
        id: request.id,
        number: request.number,
        price: request.price,
        tier: request.tier,
        status: request.status,
      },
      adminTelegram: ADMIN_TELEGRAM_USERNAME,
      adminTelegramUrl: ADMIN_TELEGRAM_URL,
      message:
        "So'rovingiz qabul qilindi. Admin tasdiqlaguncha raqamingiz o'zgarmaydi. Telegram orqali bog'laning.",
    });
  } catch (e) {
    console.error("Vanity request error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
