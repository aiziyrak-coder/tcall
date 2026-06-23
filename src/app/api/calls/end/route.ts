import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  try {
    const { roomId } = await req.json();
    if (!roomId) {
      return NextResponse.json({ error: "Xona kodi kerak" }, { status: 400 });
    }

    await prisma.call.updateMany({
      where: { roomId: roomId.toUpperCase(), status: "active" },
      data: { status: "ended", endedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
