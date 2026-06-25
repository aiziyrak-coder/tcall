import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  callId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const { callId, rating, feedback } = schema.parse(await req.json());

    const participant = await prisma.callParticipant.findUnique({
      where: { callId_userId: { callId, userId: session.userId } },
      include: { call: { select: { status: true } } },
    });

    if (!participant) {
      return NextResponse.json({ error: "Qo'ng'iroq topilmadi" }, { status: 404 });
    }

    if (!["ended", "missed"].includes(participant.call.status)) {
      return NextResponse.json({ error: "Faqat tugagan qo'ng'iroqni baholash mumkin" }, { status: 400 });
    }

    // Rating as transcript summary field (simplified — no new model needed)
    await prisma.call.update({
      where: { id: callId },
      data: {
        transcriptSummary: participant.call.status === "ended"
          ? `[Rating: ${rating}/5${feedback ? ` — ${feedback}` : ""}]`
          : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
