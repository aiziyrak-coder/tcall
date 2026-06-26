import { NextRequest, NextResponse } from "next/server";
import { createToken, getSession, jsonClearSession, jsonWithSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueTcallId } from "@/lib/tcallId";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  try {
    let user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return jsonClearSession({ user: null });
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

    if (session.tcallId !== user.tcallId || session.translationMode !== user.translationMode || session.language !== user.language) {
      const token = await createToken(freshUser);
      return jsonWithSession({ user: freshUser, token }, token);
    }

    const token =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
      req.cookies.get("session")?.value ||
      null;

    return NextResponse.json({ user: freshUser, ...(token ? { token } : {}) });
  } catch {
    return jsonClearSession({ user: null });
  }
}

export async function DELETE() {
  return jsonClearSession({ ok: true });
}
