import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendChatMessage,
  formatMessageForUser,
  type ChatMessageType,
} from "@/lib/chat-service";
import { getUserLanguage } from "@/lib/chat-translate";

const sendSchema = z.object({
  text: z.string().max(2000).optional(),
  type: z.enum(["text", "image", "video", "file"]).default("text"),
  mediaUrl: z.string().min(1).max(500).optional(),
  mediaMime: z.string().max(100).optional(),
  mediaName: z.string().max(200).optional(),
  mediaSize: z.number().int().positive().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`chat:${session.userId}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Juda ko'p xabar. ${limited.retryAfterSec}s kuting` },
      { status: 429 }
    );
  }

  try {
    const data = sendSchema.parse(await req.json());
    if (data.type === "text" && !data.text?.trim()) {
      return NextResponse.json({ error: "Xabar bo'sh" }, { status: 400 });
    }
    if (data.type !== "text" && !data.mediaUrl) {
      return NextResponse.json({ error: "Media kerak" }, { status: 400 });
    }

    const viewerLang = await getUserLanguage(session.userId, session.language || "uz");

    const result = await sendChatMessage({
      conversationId: params.id,
      senderId: session.userId,
      type: data.type as ChatMessageType,
      text: data.text,
      sourceLang: viewerLang,
      mediaUrl: data.mediaUrl,
      mediaMime: data.mediaMime,
      mediaName: data.mediaName,
      mediaSize: data.mediaSize,
    });

    const message = formatMessageForUser(result.msg, result.translations, viewerLang);

    return NextResponse.json({
      ok: true,
      messageId: result.msg.id,
      conversationId: params.id,
      message,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }
    if (e instanceof Error && e.message === "BLOCKED") {
      return NextResponse.json({ error: "Bloklangan foydalanuvchiga xabar yuborib bo'lmaydi" }, { status: 403 });
    }
    console.error("Chat send error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
