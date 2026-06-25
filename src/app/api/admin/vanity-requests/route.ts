import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const status = new URL(req.url).searchParams.get("status") || "pending";

  const requests = await prisma.vanityNumberRequest.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true, tcallId: true } },
    },
  });

  return NextResponse.json({ requests });
}
