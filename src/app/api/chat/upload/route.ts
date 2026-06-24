import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  detectChatMediaKind,
  maxSizeForKind,
  resolveChatMime,
  sanitizeUploadExt,
} from "@/lib/chat-media";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`upload:${session.userId}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Juda ko'p yuklash" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl kerak" }, { status: 400 });
    }

    if (!file.size) {
      return NextResponse.json({ error: "Bo'sh fayl" }, { status: 400 });
    }

    const kind = detectChatMediaKind(file.name, file.type);
    const mime = resolveChatMime(file.name, file.type);
    const maxSize = maxSizeForKind(kind);
    if (file.size > maxSize) {
      const mb = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json({ error: `Fayl juda katta (max ${mb} MB)` }, { status: 400 });
    }

    const ext = sanitizeUploadExt(file.name, kind);
    const filename = `${randomUUID()}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", "chat", session.userId);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(dir, filename), buffer);

    const url = `/api/chat/file/${session.userId}/${filename}`;
    return NextResponse.json({
      url,
      mime,
      name: file.name.slice(0, 200),
      size: file.size,
      type: kind,
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Yuklash xatosi" }, { status: 500 });
  }
}
