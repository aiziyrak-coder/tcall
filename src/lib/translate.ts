import { translateWithGPT } from "./openai";

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text.trim() || sourceLang === targetLang) return text;

  try {
    return await translateWithGPT(text, sourceLang, targetLang);
  } catch (e) {
    console.error("Translation failed:", e);
    return text;
  }
}
