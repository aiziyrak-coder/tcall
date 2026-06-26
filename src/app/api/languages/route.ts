import { NextResponse } from "next/server";
import { LANGUAGES, GLOBAL_LANGUAGES_TAGLINE } from "@/lib/languages";

export const dynamic = "force-dynamic";

/** Public — barcha qo'llab-quvvatlanadigan tillar ro'yxati */
export async function GET() {
  return NextResponse.json({
    languages: LANGUAGES,
    count: LANGUAGES.length,
    tagline: GLOBAL_LANGUAGES_TAGLINE,
  });
}
