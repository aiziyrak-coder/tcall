import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";
import { resolveChatMime } from "@/lib/chat-media";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string; name: string } }
) {
  const session = await getSession(_req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const userId = params.userId?.replace(/[^a-zA-Z0-9_-]/g, "");
  const name = params.name?.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!userId || !name || name.includes("..")) {
    return NextResponse.json({ error: "Noto'g'ri fayl" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "public", "uploads", "chat", userId, name);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const data = await readFile(filePath);
    const mime = resolveChatMime(name);
    return new NextResponse(data, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }
}
