import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";
import { assertMember } from "@/lib/chat-service";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string; name: string } }
) {
  const session = await getSession(req);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    await assertMember(params.conversationId, session.userId);
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const name = params.name.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!name) return new NextResponse("Not found", { status: 404 });

  try {
    const path = join(process.cwd(), "public", "uploads", "groups", params.conversationId, name);
    const data = await readFile(path);
    const ext = name.split(".").pop()?.toLowerCase() || "jpg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": MIME[ext] || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
