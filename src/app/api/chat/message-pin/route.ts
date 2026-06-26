import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { setChatMessagePinned } from "@/lib/chat-service";

const schema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  pinned: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());
    await setChatMessagePinned(
      body.conversationId,
      body.messageId,
      session.userId,
      body.pinned
    );
    return NextResponse.json({ ok: true, pinned: body.pinned });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "PIN_LIMIT") {
      return NextResponse.json({ error: "Ko'pi bilan 5 ta xabar pin qilinadi" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
