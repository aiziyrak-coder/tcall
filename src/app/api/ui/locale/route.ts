import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUILocale, getCachedUILocale } from "@/lib/ui-locale-service";
import { isSupportedLanguage } from "@/lib/languages";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
    }

    const lang = (req.nextUrl.searchParams.get("lang") || session.language || "en")
      .split("-")[0]
      .toLowerCase();

    if (!isSupportedLanguage(lang)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const cached = getCachedUILocale(lang);
    if (cached) {
      return NextResponse.json({ lang, ui: cached, cached: true });
    }

    const limited = rateLimit(`ui-locale:${session.userId}:${lang}`, 3, 3600_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Limit. ${limited.retryAfterSec}s kuting` },
        { status: 429 }
      );
    }

    const ui = await getUILocale(lang);
    return NextResponse.json({ lang, ui, cached: false });
  } catch (e) {
    console.error("UI locale error:", e);
    return NextResponse.json({ error: "Locale xatosi" }, { status: 500 });
  }
}
