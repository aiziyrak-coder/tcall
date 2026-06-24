import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const MAX_FILE = 20 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function messageType(mime: string): "image" | "video" | "file" {
  if (IMAGE_TYPES.has(mime)) return "image";
  if (VIDEO_TYPES.has(mime)) return "video";
  return "file";
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`upload:${session.userId}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Juda ko'p yuklash" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fayl kerak" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    const type = messageType(mime);
    const maxSize = type === "video" ? MAX_VIDEO : type === "image" ? MAX_IMAGE : MAX_FILE;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Fayl juda katta" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.slice(0, 8) || "bin";
    const filename = `${randomUUID()}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", "chat", session.userId);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(dir, filename), buffer);

    const url = `/uploads/chat/${session.userId}/${filename}`;
    return NextResponse.json({
      url,
      mime,
      name: file.name.slice(0, 200),
      size: file.size,
      type,
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Yuklash xatosi" }, { status: 500 });
  }
}
