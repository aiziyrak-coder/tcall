import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { deleteChatMessage, editChatMessage, formatMessageForUser } from "@/lib/chat-service";
import { getUserLanguage } from "@/lib/chat-translate";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const scopeParam = req.nextUrl.searchParams.get("scope");
  const scope = scopeParam === "me" ? "me" : "everyone";

  try {
    const result = await deleteChatMessage(params.id, params.messageId, session.userId, scope);
    return NextResponse.json(result);
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

const editSchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const { text } = editSchema.parse(await req.json());
    const viewerLang = await getUserLanguage(session.userId, session.language || "uz");
    const result = await editChatMessage(params.id, params.messageId, session.userId, text);
    const message = formatMessageForUser(result.msg, result.translations, viewerLang);
    return NextResponse.json({ ok: true, message });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }
    if (e instanceof Error && e.message === "EMPTY") {
      return NextResponse.json({ error: "Xabar bo'sh" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NOT_TEXT") {
      return NextResponse.json({ error: "Faqat matn xabarini tahrirlash mumkin" }, { status: 400 });
    }
    console.error("Chat edit error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
