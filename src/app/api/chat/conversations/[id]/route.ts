import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  assertMember,
  getMessagesForConversation,
  leaveConversation,
  markConversationRead,
  updateGroupName,
} from "@/lib/chat-service";
import { getDirectPeerPresence } from "@/lib/presence";
import { getUserLanguage } from "@/lib/chat-translate";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    await assertMember(params.id, session.userId);
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const userLang = await getUserLanguage(session.userId, session.language || "uz");
    const result = await getMessagesForConversation(
      params.id,
      session.userId,
      userLang,
      cursor
    );
    const peer = await getDirectPeerPresence(params.id, session.userId);
    return NextResponse.json({ messages: result.messages, hasMore: result.hasMore, peer });
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
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (name) {
      await updateGroupName(params.id, session.userId, name);
    } else {
      await markConversationRead(params.id, session.userId);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}

const deleteSchema = z.object({
  purgeGroup: z.boolean().optional(),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const body = deleteSchema.parse(await req.json().catch(() => ({})));
    const result = await leaveConversation(params.id, session.userId, {
      purgeGroup: body.purgeGroup,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}
