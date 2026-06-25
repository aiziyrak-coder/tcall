import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPin, isValidPin, getPinLock, recordPinFailure, resetPinAttempts } from "@/lib/pin";

const schema = z.object({ pin: z.string() });

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  let pin: string;
  try {
    pin = schema.parse(await req.json()).pin;
  } catch {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }

  const lock = getPinLock(session.userId);
  if (lock.locked) {
    return NextResponse.json(
      { error: "Juda ko'p urinish. Birozdan keyin qayta urining.", lockedMs: lock.retryAfterMs },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { pinHash: true } });
  if (!user?.pinHash) {
    // No PIN set -> nothing to verify, treat as unlocked
    return NextResponse.json({ ok: true, enabled: false });
  }

  if (!isValidPin(pin)) {
    const f = recordPinFailure(session.userId);
    return NextResponse.json({ error: "PIN noto'g'ri", attemptsLeft: f.attemptsLeft, lockedMs: f.retryAfterMs }, { status: 401 });
  }

  const ok = await verifyPin(pin, user.pinHash);
  if (!ok) {
    const f = recordPinFailure(session.userId);
    return NextResponse.json(
      { error: "PIN noto'g'ri", attemptsLeft: f.attemptsLeft, lockedMs: f.retryAfterMs },
      { status: 401 }
    );
  }

  resetPinAttempts(session.userId);
  return NextResponse.json({ ok: true });
}
