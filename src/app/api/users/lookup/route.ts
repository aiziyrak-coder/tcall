import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUserOnline } from "@/lib/socket-io";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { PROFILE_SELECT, redactLookupProfile } from "@/lib/user-profile";
import { userAvatarUrl } from "@/lib/avatar-url";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  const limited = rateLimit(`lookup:${session.userId}:${clientIp(req)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Juda ko'p qidiruv. ${limited.retryAfterSec}s kuting` },
      { status: 429 }
    );
  }

  try {
    const tcallId = req.nextUrl.searchParams.get("tcallId")?.replace(/\D/g, "");
    if (!tcallId || tcallId.length !== 9) {
      return NextResponse.json({ error: "Noto'g'ri raqam" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { tcallId },
      select: PROFILE_SELECT,
    });

    if (!user) {
      return NextResponse.json({ found: false });
    }

    if (user.tcallId === session.tcallId) {
      return NextResponse.json({ error: "Bu sizning raqamingiz" }, { status: 400 });
    }

    const blockedYou = await prisma.blockedUser.findFirst({
      where: { blockerId: user.id, blockedTcallId: session.tcallId! },
    });

    const blockedByYou = await prisma.blockedUser.findFirst({
      where: { blockerId: session.userId, blockedTcallId: tcallId },
    });

    const isFriend = !!(await prisma.contact.findFirst({
      where: { ownerId: session.userId, tcallId },
    }));

    const unblockRequest = await prisma.unblockRequest.findUnique({
      where: { requesterId_blockerId: { requesterId: session.userId, blockerId: user.id } },
      select: { status: true },
    });

    const incomingUnblock = await prisma.unblockRequest.findUnique({
      where: { requesterId_blockerId: { requesterId: user.id, blockerId: session.userId } },
      select: { status: true },
    });

    const profile = redactLookupProfile(user, isFriend);

    return NextResponse.json({
      found: true,
      user: {
        ...profile,
        avatarUrl: user.avatar ? userAvatarUrl(user.id, user.avatar) : null,
        online: isUserOnline(user.id),
        blockedYou: !!blockedYou,
        blockedByYou: !!blockedByYou,
        isFriend,
        unblockRequestPending: unblockRequest?.status === "pending",
        unblockRequestFromThem: incomingUnblock?.status === "pending",
      },
    });
  } catch (e) {
    console.error("Lookup error:", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
