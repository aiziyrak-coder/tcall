import { getAudioConstraints } from "./mobile";

const MIC_GRANTED_KEY = "tcall:mic-granted";

export function markMicGranted() {
  try {
    sessionStorage.setItem(MIC_GRANTED_KEY, "1");
    localStorage.setItem(MIC_GRANTED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function wasMicGrantedBefore(): boolean {
  try {
    return (
      sessionStorage.getItem(MIC_GRANTED_KEY) === "1" ||
      localStorage.getItem(MIC_GRANTED_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export async function queryMicPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result.state as "granted" | "denied" | "prompt";
  } catch {
    return "unknown";
  }
}

/** User gesture kontekstida chaqiring — brauzer ruxsat oynasini ochadi */
export async function requestMicrophoneStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia unavailable");
  }
  const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
  markMicGranted();
  return stream;
}

/** Dashboard dial/accept gesture ichida — ruxsatni oldindan so'rash */
export async function prefetchMicrophoneAccess(): Promise<boolean> {
  try {
    const perm = await queryMicPermission();
    if (perm === "granted") {
      markMicGranted();
      return true;
    }
    if (perm === "denied") return false;
    const stream = await requestMicrophoneStream();
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
