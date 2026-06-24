import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { addMembersToGroup } from "@/lib/chat-service";

const schema = z.object({
  memberTcallIds: z.array(z.string()).min(1).max(20),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const data = schema.parse(await req.json());
    const result = await addMembersToGroup(
      params.id,
      session.userId,
      data.memberTcallIds
    );
    return NextResponse.json({ ok: true, added: result.added });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NOT_GROUP") {
      return NextResponse.json({ error: "Faqat guruh uchun" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}
