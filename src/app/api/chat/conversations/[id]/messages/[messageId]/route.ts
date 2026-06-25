import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteChatMessage } from "@/lib/chat-service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    await deleteChatMessage(params.id, params.messageId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
