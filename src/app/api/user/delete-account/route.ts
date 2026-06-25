import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, verifyPassword, jsonClearSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { purgeUsersByIds } from "@/lib/admin-cleanup";

const schema = z.object({ password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let password: string;
  try {
    password = schema.parse(await req.json()).password;
  } catch {
    return NextResponse.json({ error: "Parol kiriting" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { password: true },
  });
  if (!user) return jsonClearSession({ ok: true });

  const ok = await verifyPassword(password, user.password);
  if (!ok) return NextResponse.json({ error: "Parol noto'g'ri" }, { status: 400 });

  await purgeUsersByIds([session.userId]);
  return jsonClearSession({ ok: true, deleted: true });
}
