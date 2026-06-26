/**
 * Sync Android Languages.kt from src/lib/language-registry.ts
 * Run: npm run generate:languages
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { LANGUAGES } from "../src/lib/language-registry";

const outPath = join(
  process.cwd(),
  "platforms/android/app/src/main/kotlin/uz/tcall/ui/util/Languages.kt"
);

const lines = LANGUAGES.map(
  (l) => `    LangOption("${l.code}", ${JSON.stringify(l.name)}),`
);

const kotlin = `package uz.tcall.ui.util

// AUTO-GENERATED — npm run generate:languages
data class LangOption(val code: String, val label: String)

val TCALL_LANGUAGES: List<LangOption> = listOf(
${lines.join("\n")}
)

fun langLabel(code: String): String =
    TCALL_LANGUAGES.find { it.code == code }?.label ?: code.uppercase()
`;

writeFileSync(outPath, kotlin, "utf8");
console.log(`Wrote ${LANGUAGES.length} languages → ${outPath}`);
