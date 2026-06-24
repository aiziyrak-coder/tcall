import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { userAvatarUrl } from "@/lib/avatar-url";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`avatar:${session.userId}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Juda ko'p yuklash" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Rasm kerak" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Rasm juda katta (max 5 MB)" }, { status: 400 });
    }

    const mime = file.type || "image/jpeg";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: "Faqat JPG, PNG, WebP, GIF" }, { status: 400 });
    }

    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
    const filename = `${randomUUID()}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", "avatars", session.userId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatar: filename },
    });

    const url = userAvatarUrl(session.userId, filename);
    return NextResponse.json({ ok: true, avatar: filename, url });
  } catch (e) {
    console.error("Avatar upload error:", e);
    return NextResponse.json({ error: "Yuklash xatosi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.userId },
    data: { avatar: null },
  });
  return NextResponse.json({ ok: true });
}
