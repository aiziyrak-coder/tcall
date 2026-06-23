import { NextRequest, NextResponse } from "next/server";
import { getSession, createToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const body = await req.json();
    const numberId = body?.numberId?.toString();
    if (!numberId) {
      return NextResponse.json({ error: "Raqam tanlanmagan" }, { status: 400 });
    }

    const vanity = await prisma.vanityNumber.findUnique({ where: { id: numberId } });
    if (!vanity || !vanity.available) {
      return NextResponse.json({ error: "Raqam mavjud emas" }, { status: 404 });
    }

    const existingVanity = await prisma.vanityNumber.findUnique({
      where: { userId: session.userId },
    });
    if (existingVanity) {
      return NextResponse.json({ error: "Sizda allaqachon chiroyli raqam bor" }, { status: 400 });
    }

    const conflict = await prisma.user.findUnique({ where: { tcallId: vanity.number } });
    if (conflict) {
      return NextResponse.json({ error: "Raqam band" }, { status: 409 });
    }

    const user = await prisma.$transaction(async (tx) => {
      await tx.vanityNumber.update({
        where: { id: vanity.id },
        data: { available: false, userId: session.userId, purchasedAt: new Date() },
      });

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
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      tcallId: user.tcallId!,
      tier: vanity.tier,
    });
  } catch (e) {
    console.error("Purchase error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
