import { transcribeAudio } from "./openai";
import { isValidTranscript } from "./call-translation";

function pickFilename(name: string, buffer: Buffer): string {
  if (name && name.includes(".")) return name;
  const head = buffer.subarray(0, 12);
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return "speech.webm";
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return "speech.mp4";
  if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46) return "speech.wav";
  if (head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67 && head[3] === 0x53) return "speech.ogg";
  return name || "speech.webm";
}

const ALT_NAMES = ["speech.webm", "speech.mp4", "speech.m4a", "speech.ogg", "speech.wav"];

/** Whisper — bir necha usul bilan transkripsiya */
export async function transcribeForInterpreter(
  buffer: Buffer,
  originalName: string,
  language?: string
): Promise<string> {
  const primaryName = pickFilename(originalName, buffer);
  const names = [primaryName, ...ALT_NAMES.filter((n) => n !== primaryName)];

  const attempts: (string | undefined)[] = language ? [language, undefined] : [undefined];

  for (const lang of attempts) {
    for (const name of names) {
      const text = await transcribeAudio(buffer, name, lang);
      if (isValidTranscript(text)) return text;
    }
  }

  return "";
}

export { pickFilename };
