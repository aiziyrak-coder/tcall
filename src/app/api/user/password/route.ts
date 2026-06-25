import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

    const { currentPassword, newPassword } = schema.parse(await req.json());

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: "Yangi parol eski parol bilan bir xil bo'lmasin" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { password: true },
    });
    if (!user) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    const currentValid = await verifyPassword(currentPassword, user.password);
    if (!currentValid) {
      return NextResponse.json({ error: "Joriy parol noto'g'ri" }, { status: 400 });
    }

    const nextHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: nextHash },
    });

    return NextResponse.json({ ok: true, message: "Parol muvaffaqiyatli yangilandi" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message || "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
