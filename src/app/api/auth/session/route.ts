import { NextResponse } from "next/server";
import { clearSessionCookie, createToken, getSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueTcallId } from "@/lib/tcallId";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    let user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      await clearSessionCookie();
      return NextResponse.json({ user: null });
    }

    if (!user.tcallId) {
      const tcallId = await generateUniqueTcallId();
      user = await prisma.user.update({
        where: { id: user.id },
        data: { tcallId },
      });
    }

    const freshUser = {
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      tcallId: user.tcallId!,
      translationMode: user.translationMode,
    };

    if (session.tcallId !== user.tcallId || session.translationMode !== user.translationMode) {
      const token = await createToken(freshUser);
      await setSessionCookie(token);
    }

    return NextResponse.json({ user: freshUser });
  } catch {
    await clearSessionCookie();
    return NextResponse.json({ user: null });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
