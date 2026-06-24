import { transcribeAudio } from "./openai";
import { getTranscriptionAttempts, isValidTranscript } from "./call-translation";

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

/** Faqat buffer formatiga mos fayl nomlarini sinash — noto'g'ri format xatolarini kamaytiradi */
function filenamesForBuffer(buffer: Buffer, originalName: string): string[] {
  const primary = pickFilename(originalName, buffer);
  const names: string[] = [primary];
  const add = (n: string) => {
    if (!names.includes(n)) names.push(n);
  };

  const head = buffer.subarray(0, 12);
  const isWebm = head[0] === 0x1a && head[1] === 0x45;
  const isMp4 = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
  const isWav = head[0] === 0x52 && head[1] === 0x49;
  const isOgg = head[0] === 0x4f && head[1] === 0x67;
  const isMp3 = head[0] === 0xff && (head[1] & 0xe0) === 0xe0;

  if (isWebm) add("speech.webm");
  if (isMp4) {
    add("speech.mp4");
    add("speech.m4a");
  }
  if (isWav) add("speech.wav");
  if (isOgg) add("speech.ogg");
  if (isMp3) add("speech.mp3");

  if (names.length === 1) {
    for (const n of ["speech.webm", "speech.mp4", "speech.m4a", "speech.ogg", "speech.wav"]) add(n);
  }

  return names;
}

/** Whisper — ko'p tilli, ko'p formatli transkripsiya */
export async function transcribeForInterpreter(
  buffer: Buffer,
  originalName: string,
  language?: string
): Promise<string> {
  const names = filenamesForBuffer(buffer, originalName);
  const langAttempts = getTranscriptionAttempts(language);
  let best = "";

  for (const { hintLang, whisperLang } of langAttempts) {
    for (const name of names) {
      const text = await transcribeAudio(buffer, name, hintLang, whisperLang);
      if (!isValidTranscript(text)) continue;
      if (text.length > best.length) best = text;
      if (text.length >= 12) return text;
    }
  }

  return best;
}

export { pickFilename };
