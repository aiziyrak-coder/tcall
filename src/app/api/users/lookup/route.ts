import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: { name: true, language: true, tcallId: true },
  });

  if (!user) {
    return NextResponse.json({ found: false });
  }

  if (user.tcallId === session.tcallId) {
    return NextResponse.json({ error: "Bu sizning raqamingiz" }, { status: 400 });
  }

  return NextResponse.json({ found: true, user });
}
