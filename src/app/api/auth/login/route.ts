import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie, verifyPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !(await verifyPassword(data.password, user.password))) {
      return NextResponse.json({ error: "Email yoki parol noto'g'ri" }, { status: 401 });
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      user: { userId: user.id, email: user.email, name: user.name, language: user.language },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
