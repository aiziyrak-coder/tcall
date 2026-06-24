import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markCallEnded } from "@/lib/call-service";
import { generateCallSummary } from "@/lib/call-summary";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  try {
    const { roomId } = await req.json();
    if (!roomId) {
      return NextResponse.json({ error: "Xona kodi kerak" }, { status: 400 });
    }

    const result = await markCallEnded(roomId.toString(), session.userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 403 });
    }

    if (result.callId && !result.alreadyEnded) {
      void generateCallSummary(result.callId);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
