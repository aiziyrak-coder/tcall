import { getAudioConstraints, getPreferredAudioMimeType } from "@/lib/mobile";

export type VoiceRecordSession = {
  recorder: MediaRecorder;
  stream: MediaStream;
  mime: string;
  chunks: Blob[];
};

export async function startVoiceRecord(): Promise<VoiceRecordSession> {
  const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
  const mime = getPreferredAudioMimeType();
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  recorder.start();
  return { recorder, stream, mime, chunks };
}

export function stopVoiceRecord(session: VoiceRecordSession): Promise<File | null> {
  const { recorder, stream, mime, chunks } = session;
  return new Promise((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (!chunks.length) {
        resolve(null);
        return;
      }
      const type = mime.split(";")[0] || "audio/webm";
      const blob = new Blob(chunks, { type });
      const ext = type.includes("mp4") || type.includes("aac") ? "m4a" : "webm";
      resolve(new File([blob], `voice-${Date.now()}.${ext}`, { type }));
    };
    if (recorder.state === "recording") recorder.stop();
    else resolve(null);
  });
}
