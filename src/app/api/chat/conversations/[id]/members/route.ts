import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  addMembersToGroup,
  removeMemberFromGroup,
  setMemberRole,
} from "@/lib/chat-service";

const addSchema = z.object({
  memberTcallIds: z.array(z.string().regex(/^\d{9}$/)).min(1).max(20),
});

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["admin", "member", "owner"]),
});

const removeSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const data = addSchema.parse(await req.json());
    const result = await addMembersToGroup(
      params.id,
      session.userId,
      data.memberTcallIds
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NOT_GROUP") {
      return NextResponse.json({ error: "Faqat guruh uchun" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NO_MEMBERS") {
      return NextResponse.json({ error: "Raqamlar topilmadi" }, { status: 400 });
    }
    return NextResponse.json({ error: "Faqat admin qo'sha oladi" }, { status: 403 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const data = roleSchema.parse(await req.json());
    const result = await setMemberRole(params.id, session.userId, data.userId, data.role);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });

  try {
    const data = removeSchema.parse(await req.json());
    const result = await removeMemberFromGroup(params.id, session.userId, data.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
}
