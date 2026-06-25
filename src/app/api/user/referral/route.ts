import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tcall.uz";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tcallId: true },
  });
  if (!user?.tcallId) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

  const referredCount = await prisma.user.count({ where: { referredById: session.userId } });

  return NextResponse.json({
    code: user.tcallId,
    inviteUrl: `${APP_URL}/register?ref=${user.tcallId}`,
    profileUrl: `${APP_URL}/u/${user.tcallId}`,
    referredCount,
  });
}
