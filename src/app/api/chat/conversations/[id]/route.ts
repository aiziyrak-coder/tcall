import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  assertMember,
  getMessagesForConversation,
  markConversationRead,
} from "@/lib/chat-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    await assertMember(params.id, session.userId);
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const messages = await getMessagesForConversation(
      params.id,
      session.userId,
      session.language || "uz",
      cursor
    );
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    await markConversationRead(params.id, session.userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}
