import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUserOnline } from "@/lib/socket-io";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const tcallId = req.nextUrl.searchParams.get("tcallId")?.replace(/\D/g, "");
  if (!tcallId || tcallId.length !== 9) {
    return NextResponse.json({ error: "Noto'g'ri raqam" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { tcallId },
    select: { id: true, name: true, language: true, tcallId: true, status: true, bio: true },
  });

  if (!user) {
    return NextResponse.json({ found: false });
  }

  if (user.tcallId === session.tcallId) {
    return NextResponse.json({ error: "Bu sizning raqamingiz" }, { status: 400 });
  }

  const blocked = await prisma.blockedUser.findFirst({
    where: { blockerId: user.id, blockedTcallId: session.tcallId! },
  });

  return NextResponse.json({
    found: true,
    user: {
      ...user,
      online: isUserOnline(user.id),
      blockedYou: !!blocked,
    },
  });
}
