import { prisma } from "./prisma";
import { summarizeCallTranscript } from "./openai";

export async function generateCallSummary(callId: string): Promise<void> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { transcriptSummary: true },
  });
  if (call?.transcriptSummary) return;

  const transcripts = await prisma.callTranscript.findMany({
    where: { callId },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  if (transcripts.length === 0) return;

  const lines = transcripts.map((t) => {
    const text = t.translatedText || t.originalText;
    return `${t.speakerName}: ${text}`;
  });

  try {
    const summary = await summarizeCallTranscript(lines.join("\n"));
    if (summary) {
      await prisma.call.updateMany({
        where: { id: callId, transcriptSummary: null },
        data: { transcriptSummary: summary },
      });
    }
  } catch (e) {
    console.error("Call summary failed:", e);
  }
}
