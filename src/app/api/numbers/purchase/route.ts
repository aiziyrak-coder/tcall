import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Eski to'g'ridan-to'g'ri sotib olish o'chirildi — admin tasdiqlash orqali */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  }

  return NextResponse.json(
    {
      error:
        "To'g'ridan-to'g'ri sotib olish mavjud emas. Raqam tanlang va admin bilan bog'laning.",
      useRequestFlow: true,
    },
    { status: 400 }
  );
}
