import { translateWithGPT, translateForCall } from "./openai";

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  context: string[] = []
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;

  try {
    return context.length > 0
      ? await translateForCall(text, sourceLang, targetLang, context)
      : await translateWithGPT(text, sourceLang, targetLang);
  } catch (e) {
    console.error("Translation failed:", e);
    return text;
  }
}
