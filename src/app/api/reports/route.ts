import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const createSchema = z.object({
  type: z.enum(["chat", "profile", "call", "other"]),
  targetId: z.string().min(1).max(200),
  reason: z.enum(["pornographic", "political", "illegal", "spam", "harassment", "other"]),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`report:${session.userId}:${clientIp(req)}`, 5, 3_600_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Juda ko'p shikoyat. ${limited.retryAfterSec}s kuting` },
      { status: 429 }
    );
  }

  try {
    const body = createSchema.parse(await req.json());
    const report = await prisma.contentReport.create({
      data: {
        ...body,
        reportedBy: session.userId,
        status: "pending",
      },
    });
    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
