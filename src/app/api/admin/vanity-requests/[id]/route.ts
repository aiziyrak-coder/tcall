import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const body = await req.json();
    const action = body?.action?.toString();
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
    }

    const request = await prisma.vanityNumberRequest.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!request || request.status !== "pending") {
      return NextResponse.json({ error: "So'rov topilmadi" }, { status: 404 });
    }

    if (action === "reject") {
      await prisma.vanityNumberRequest.update({
        where: { id: request.id },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy: session!.email,
        },
      });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    await prisma.$transaction(async (tx) => {
      const fresh = await tx.vanityNumberRequest.findUnique({ where: { id: request.id } });
      if (!fresh || fresh.status !== "pending") throw new Error("STALE");

      const [userTaken, otherPending] = await Promise.all([
        tx.user.findFirst({
          where: { tcallId: request.number, NOT: { id: request.userId } },
          select: { id: true },
        }),
        tx.vanityNumberRequest.findFirst({
          where: {
            number: request.number,
            status: "pending",
            NOT: { id: request.id },
          },
          select: { id: true },
        }),
      ]);

      if (userTaken || otherPending) throw new Error("TAKEN");

      const existingVanity = await tx.vanityNumber.findUnique({ where: { userId: request.userId } });
      if (existingVanity) throw new Error("HAS_VANITY");

      await tx.user.update({
        where: { id: request.userId },
        data: { tcallId: request.number },
      });

      const catalog = await tx.vanityNumber.findUnique({ where: { number: request.number } });
      if (catalog) {
        await tx.vanityNumber.update({
          where: { id: catalog.id },
          data: { available: false, userId: request.userId, purchasedAt: new Date() },
        });
      } else {
        await tx.vanityNumber.create({
          data: {
            number: request.number,
            price: request.price,
            tier: request.tier,
            available: false,
            userId: request.userId,
            purchasedAt: new Date(),
          },
        });
      }

      await tx.vanityNumberRequest.update({
        where: { id: request.id },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: session!.email,
        },
      });

      await tx.vanityNumberRequest.updateMany({
        where: {
          userId: request.userId,
          status: "pending",
          NOT: { id: request.id },
        },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
          reviewedBy: session!.email,
          note: "Boshqa so'rov tasdiqlandi",
        },
      });
    });

    return NextResponse.json({ success: true, status: "approved" });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "TAKEN") {
        return NextResponse.json({ error: "Raqam allaqachon band" }, { status: 409 });
      }
      if (e.message === "HAS_VANITY") {
        return NextResponse.json({ error: "Foydalanuvchida chiroyli raqam bor" }, { status: 409 });
      }
      if (e.message === "STALE") {
        return NextResponse.json({ error: "So'rov allaqachon ko'rib chiqilgan" }, { status: 409 });
      }
    }
    console.error("Admin vanity review error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
