import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  type: z.enum(["chat", "profile", "call", "other"]),
  targetId: z.string().min(1),
  reason: z.enum(["pornographic", "political", "illegal", "spam", "harassment", "other"]),
  notes: z.string().max(1000).optional(),
  reportedBy: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 25;

  const [reports, total] = await Promise.all([
    prisma.contentReport.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contentReport.count({ where: { status } }),
  ]);

  return NextResponse.json({ reports, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  try {
    const body = createSchema.parse(await req.json());
    const report = await prisma.contentReport.create({ data: { ...body, status: "pending" } });
    return NextResponse.json({ ok: true, report });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

const patchSchema = z.object({
  reportId: z.string(),
  action: z.enum(["dismiss", "resolve"]),
});

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  try {
    const { reportId, action } = patchSchema.parse(await req.json());
    await prisma.contentReport.update({
      where: { id: reportId },
      data: { status: action === "resolve" ? "resolved" : "dismissed", reviewedBy: session.email, reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
