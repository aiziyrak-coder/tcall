import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string; name: string } }
) {
  const session = await getSession(_req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const userId = params.userId?.replace(/[^a-zA-Z0-9_-]/g, "");
  const name = params.name?.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!userId || !name) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  try {
    const path = join(process.cwd(), "public", "uploads", "avatars", userId, name);
    const data = await readFile(path);
    const ext = name.split(".").pop()?.toLowerCase() || "jpg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": MIME[ext] || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }
}
