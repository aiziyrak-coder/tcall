import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCanManageGroup } from "@/lib/chat-service";
import { groupAvatarUrl } from "@/lib/avatar-url";
import { rateLimit } from "@/lib/rate-limit";
import { extForImageMime, normalizeImageMime } from "@/lib/image-mime";

const MAX_SIZE = 5 * 1024 * 1024;

async function readUploadEntry(entry: FormDataEntryValue | null): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!entry || typeof entry === "string") return null;
  const blob = entry as Blob;
  if (!blob.size) return null;
  const buffer = Buffer.from(await blob.arrayBuffer());
  const mime = normalizeImageMime(entry instanceof File ? entry.type : blob.type, buffer);
  if (!mime) return null;
  return { buffer, mime };
}

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`group-avatar:${session.userId}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Juda ko'p yuklash" }, { status: 429 });
  }

  try {
    await assertCanManageGroup(params.id, session.userId);

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
    const dir = join(process.cwd(), "public", "uploads", "groups", params.id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), upload.buffer);

    await prisma.conversation.update({
      where: { id: params.id },
      data: { avatar: filename, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, avatar: filename, url: groupAvatarUrl(params.id, filename) });
  } catch {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    await assertCanManageGroup(params.id, session.userId);
    await prisma.conversation.update({
      where: { id: params.id },
      data: { avatar: null, updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}
