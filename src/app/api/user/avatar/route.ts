import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { userAvatarUrl } from "@/lib/avatar-url";
import { extForImageMime, normalizeImageMime } from "@/lib/image-mime";

const MAX_SIZE = 5 * 1024 * 1024;
const UPLOAD_ROOT = join(process.cwd(), "public", "uploads", "avatars");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readUploadEntry(entry: FormDataEntryValue | null): Promise<{ buffer: Buffer; mime: string; name: string } | null> {
  if (!entry || typeof entry === "string") return null;

  const blob = entry as Blob;
  if (!blob.size) return null;

  const buffer = Buffer.from(await blob.arrayBuffer());
  const name = entry instanceof File && entry.name ? entry.name : "photo.jpg";
  const mime = normalizeImageMime(entry instanceof File ? entry.type : blob.type, buffer);
  if (!mime) return null;

  return { buffer, mime, name };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

    const limited = rateLimit(`avatar:${session.userId}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: "Juda ko'p yuklash" }, { status: 429 });
    }

    const formData = await req.formData();
    const upload = await readUploadEntry(formData.get("file"));
    if (!upload) {
      return NextResponse.json({ error: "Rasm kerak (JPG, PNG, WebP, GIF)" }, { status: 400 });
    }

    if (upload.buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: "Rasm juda katta (max 5 MB)" }, { status: 400 });
    }

    const ext = extForImageMime(upload.mime);
    const filename = `${randomUUID()}.${ext}`;
    const dir = join(UPLOAD_ROOT, session.userId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), upload.buffer);

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
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatar: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Avatar delete error:", e);
    return NextResponse.json({ error: "Xatolik" }, { status: 500 });
  }
}
