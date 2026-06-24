import { getAudioConstraints, getInterpreterAudioConstraints } from "./mobile";
import { unlockBrowserAudio } from "./audio-unlock";
import {
  cacheMicStream,
  hasCachedMicStream,
  takeCachedMicStream,
} from "./mic-stream-cache";

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
    return wasMicGrantedBefore() ? "granted" : "unknown";
  }
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    if (result.state === "granted") markMicGranted();
    return result.state as "granted" | "denied" | "prompt";
  } catch {
    return wasMicGrantedBefore() ? "granted" : "unknown";
  }
}

export function watchMicPermission(onGranted: () => void) {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
  void navigator.permissions
    .query({ name: "microphone" as PermissionName })
    .then((result) => {
      if (result.state === "granted") {
        markMicGranted();
        onGranted();
      }
      result.onchange = () => {
        if (result.state === "granted") {
          markMicGranted();
          onGranted();
        }
      };
    })
    .catch(() => {});
}

/** User gesture kontekstida chaqiring — brauzer ruxsat oynasini ochadi */
export async function requestMicrophoneStream(interpreter = false): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia unavailable");
  }
  const constraints = interpreter ? getInterpreterAudioConstraints() : getAudioConstraints();
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  markMicGranted();
  void unlockBrowserAudio();
  return stream;
}

/** Dashboard dial/accept/join gesture ichida — streamni saqlab qoladi */
export async function prefetchMicrophoneAccess(): Promise<boolean> {
  try {
    if (hasCachedMicStream()) {
      markMicGranted();
      return true;
    }

    const perm = await queryMicPermission();
    if (perm === "denied") return false;
    if (perm === "granted") {
      markMicGranted();
      try {
        const stream = await navigator.mediaDevices.getUserMedia(getAudioConstraints());
        cacheMicStream(stream);
        return true;
      } catch {
        return wasMicGrantedBefore();
      }
    }

    const stream = await requestMicrophoneStream();
    cacheMicStream(stream);
    return true;
  } catch {
    return false;
  }
}

export async function acquireMicrophoneStream(interpreter = false): Promise<MediaStream> {
  const cached = takeCachedMicStream();
  if (cached) {
    markMicGranted();
    return cached;
  }

  const perm = await queryMicPermission();
  if (perm === "denied") {
    throw new Error("Mic denied");
  }

  const constraints = interpreter ? getInterpreterAudioConstraints() : getAudioConstraints();

  if (perm === "granted" || wasMicGrantedBefore()) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      markMicGranted();
      void unlockBrowserAudio();
      return stream;
    } catch (err) {
      if (wasMicGrantedBefore() || perm === "granted") {
        throw new Error("NEEDS_GESTURE");
      }
      throw err;
    }
  }

  return requestMicrophoneStream(interpreter);
}

export { takeCachedMicStream, hasCachedMicStream };
