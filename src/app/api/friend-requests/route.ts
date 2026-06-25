import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { emitToUser } from "@/lib/socket-io";

const postSchema = z.object({
  tcallId: z.string().regex(/^\d{9}$/),
  name: z.string().min(1).max(80),
});

const patchSchema = z.object({
  senderTcallId: z.string().regex(/^\d{9}$/),
  accept: z.boolean(),
});

/** GET — kiruvchi do'stlik so'rovlari */
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const incoming = await prisma.friendRequest.findMany({
    where: { receiverId: session.userId, status: "pending" },
    include: {
      sender: { select: { id: true, name: true, tcallId: true, language: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    incoming: incoming.map((r) => ({
      id: r.id,
      sender: r.sender,
      createdAt: r.createdAt,
    })),
  });
}

/** POST — do'stlik so'rovi yuborish */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.tcallId) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const limited = rateLimit(`friend-req:${session.userId}`, 10, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Juda ko'p so'rov" }, { status: 429 });

  try {
    const { tcallId, name } = postSchema.parse(await req.json());

    if (tcallId === session.tcallId) {
      return NextResponse.json({ error: "O'zingizga so'rov yubora olmaysiz" }, { status: 400 });
    }

    const receiver = await prisma.user.findUnique({ where: { tcallId } });
    if (!receiver) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });

    // Bloklangan bo'lsa ruxsat yo'q
    const blocked = await prisma.blockedUser.findFirst({
      where: { blockerId: receiver.id, blockedTcallId: session.tcallId },
    });
    if (blocked) return NextResponse.json({ error: "Bu foydalanuvchi sizi bloklagan" }, { status: 403 });

    // Allaqachon do'st
    const alreadyFriend = await prisma.contact.findFirst({
      where: { ownerId: session.userId, tcallId },
    });
    if (alreadyFriend) return NextResponse.json({ ok: true, alreadyFriend: true });

    // Avval yuborilgan so'rov
    const existing = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: session.userId, receiverId: receiver.id } },
    });
    if (existing) {
      if (existing.status === "pending") return NextResponse.json({ ok: true, alreadySent: true });
      // Rad etilgan bo'lsa qayta yuborishga ruxsat
      await prisma.friendRequest.update({
        where: { id: existing.id },
        data: { status: "pending", resolvedAt: null, createdAt: new Date() },
      });
      emitToUser(receiver.id, "friend-request", {
        sender: { id: session.userId, name: session.name, tcallId: session.tcallId },
      });
      return NextResponse.json({ ok: true });
    }

    // Agar ikkinchi tomon allaqachon so'rov yuborgan bo'lsa — avtomatik qabul
    const reverse = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: receiver.id, receiverId: session.userId } },
    });

    if (reverse && reverse.status === "pending") {
      // Ikki tomonni qo'shish
      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id: reverse.id },
          data: { status: "accepted", resolvedAt: new Date() },
        }),
        prisma.contact.upsert({
          where: { ownerId_tcallId: { ownerId: session.userId, tcallId } },
          create: { ownerId: session.userId, name: receiver.name, tcallId },
          update: { name: receiver.name },
        }),
        prisma.contact.upsert({
          where: { ownerId_tcallId: { ownerId: receiver.id, tcallId: session.tcallId } },
          create: { ownerId: receiver.id, name: name || session.name, tcallId: session.tcallId },
          update: {},
        }),
      ]);
      emitToUser(receiver.id, "friend-accepted", {
        friend: { id: session.userId, name: session.name, tcallId: session.tcallId },
      });
      return NextResponse.json({ ok: true, accepted: true });
    }

    // Yangi so'rov
    await prisma.friendRequest.create({
      data: { senderId: session.userId, receiverId: receiver.id },
    });

    emitToUser(receiver.id, "friend-request", {
      sender: { id: session.userId, name: session.name, tcallId: session.tcallId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

/** PATCH — qabul qilish yoki rad etish */
export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.tcallId) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const { senderTcallId, accept } = patchSchema.parse(await req.json());

    const sender = await prisma.user.findUnique({ where: { tcallId: senderTcallId } });
    if (!sender) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    // Race condition: agar allaqachon do'st bo'lsa — 200 qaytaramiz
    const alreadyFriend = await prisma.contact.findFirst({
      where: { ownerId: session.userId, tcallId: senderTcallId },
    });
    if (alreadyFriend) return NextResponse.json({ ok: true, accepted: true, alreadyFriends: true });

    const request = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: sender.id, receiverId: session.userId } },
    });
    if (!request || request.status !== "pending") {
      return NextResponse.json({ error: "So'rov topilmadi yoki allaqachon hal qilingan" }, { status: 404 });
    }

    if (accept) {
      try {
        await prisma.$transaction([
          prisma.friendRequest.update({
            where: { id: request.id },
            data: { status: "accepted", resolvedAt: new Date() },
          }),
          prisma.contact.upsert({
            where: { ownerId_tcallId: { ownerId: session.userId, tcallId: senderTcallId } },
            create: { ownerId: session.userId, name: sender.name, tcallId: senderTcallId },
            update: { name: sender.name },
          }),
          prisma.contact.upsert({
            where: { ownerId_tcallId: { ownerId: sender.id, tcallId: session.tcallId! } },
            create: { ownerId: sender.id, name: session.name, tcallId: session.tcallId! },
            update: {},
          }),
        ]);
      } catch (txErr) {
        // Unique constraint — allaqachon do'st
        console.warn("Friend accept tx:", txErr);
      }
      emitToUser(sender.id, "friend-accepted", {
        friend: { id: session.userId, name: session.name, tcallId: session.tcallId },
      });
    } else {
      await prisma.friendRequest.update({
        where: { id: request.id },
        data: { status: "rejected", resolvedAt: new Date() },
      });
      emitToUser(sender.id, "friend-rejected", {
        tcallId: session.tcallId,
      });
    }

    return NextResponse.json({ ok: true, accepted: accept });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

/** DELETE — yuborilgan so'rovni bekor qilish */
export async function DELETE(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  const tcallId = req.nextUrl.searchParams.get("tcallId");
  if (!tcallId) return NextResponse.json({ error: "tcallId kerak" }, { status: 400 });

  const receiver = await prisma.user.findUnique({ where: { tcallId } });
  if (!receiver) return NextResponse.json({ ok: true });

  await prisma.friendRequest.deleteMany({
    where: { senderId: session.userId, receiverId: receiver.id, status: "pending" },
  });

  return NextResponse.json({ ok: true });
}
