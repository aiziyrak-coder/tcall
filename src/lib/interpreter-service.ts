import { transcribeAudio } from "./openai";
import {
  getInterpreterTranscriptionAttempts,
  isValidInterpreterTranscript,
} from "./call-translation";

function pickFilename(name: string, buffer: Buffer): string {
  if (name && name.includes(".")) return name;
  const head = buffer.subarray(0, 12);
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "speech.webm";
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return "speech.mp4";
  if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46) return "speech.wav";
  if (head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67 && head[3] === 0x53) return "speech.ogg";
  if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return "speech.mp3";
  return name || "speech.webm";
}

/** Whisper — tez yo'l: 1–2 urinish, birinchi ishonchli natija */
export async function transcribeForInterpreter(
  buffer: Buffer,
  originalName: string,
  language?: string
): Promise<string> {
  const filename = pickFilename(originalName, buffer);
  const attempts = getInterpreterTranscriptionAttempts(language).slice(0, 3);

  for (const { hintLang, whisperLang } of attempts) {
    const result = await transcribeAudio(buffer, filename, hintLang, whisperLang, {
      interpreterMode: true,
      fast: true,
    });
    if (isValidInterpreterTranscript(result.text, buffer.length)) return result.text;
  }

  return "";
}

export { pickFilename };
