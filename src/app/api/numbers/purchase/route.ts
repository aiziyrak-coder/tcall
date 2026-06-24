import { NextRequest, NextResponse } from "next/server";
import { getSession, createToken, jsonWithSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const limited = rateLimit(`purchase:${session.userId}`, 5, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Juda ko'p urinish. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const numberId = body?.numberId?.toString();
    if (!numberId) {
      return NextResponse.json({ error: "Raqam tanlanmagan" }, { status: 400 });
    }

    const existingVanity = await prisma.vanityNumber.findUnique({
      where: { userId: session.userId },
    });
    if (existingVanity) {
      return NextResponse.json({ error: "Sizda allaqachon chiroyli raqam bor" }, { status: 400 });
    }

    const user = await prisma.$transaction(async (tx) => {
      const vanity = await tx.vanityNumber.findUnique({ where: { id: numberId } });
      if (!vanity || !vanity.available) {
        throw new Error("UNAVAILABLE");
      }

      const conflict = await tx.user.findUnique({ where: { tcallId: vanity.number } });
      if (conflict) throw new Error("TAKEN");

      const updated = await tx.vanityNumber.updateMany({
        where: { id: vanity.id, available: true },
        data: { available: false, userId: session.userId, purchasedAt: new Date() },
      });
      if (updated.count === 0) throw new Error("RACE");

      return tx.user.update({
        where: { id: session.userId },
        data: { tcallId: vanity.number },
      });
    });

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      tcallId: user.tcallId!,
      translationMode: user.translationMode,
    });

    const vanity = await prisma.vanityNumber.findFirst({
      where: { userId: session.userId },
      select: { tier: true },
    });

    return jsonWithSession(
      { success: true, tcallId: user.tcallId!, tier: vanity?.tier },
      token
    );
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "UNAVAILABLE") {
        return NextResponse.json({ error: "Raqam mavjud emas" }, { status: 404 });
      }
      if (e.message === "TAKEN" || e.message === "RACE") {
        return NextResponse.json({ error: "Raqam band" }, { status: 409 });
      }
    }
    console.error("Purchase error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
