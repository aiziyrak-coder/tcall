import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, createToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  mode: z.enum(["text", "voice"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const body = await req.json();
    const { mode } = schema.parse(body);

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { translationMode: mode },
    });

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      tcallId: user.tcallId!,
      translationMode: user.translationMode,
    });
    await setSessionCookie(token);

    return NextResponse.json({ translationMode: user.translationMode });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
