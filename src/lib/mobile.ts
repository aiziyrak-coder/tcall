export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
  );
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      return await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isAndroidNative(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { TcallAndroidBridge?: unknown; TcallNative?: { isAndroid?: boolean } };
  return !!(w.TcallAndroidBridge || w.TcallNative?.isAndroid);
}

export function getPreferredAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const types = isAndroidNative()
    ? ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm";
}

export function getAudioConstraints(): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 },
      channelCount: { ideal: 1 },
      // @ts-expect-error — ba'zi brauzerlar qo'llab-quvvatlaydi
      voiceIsolation: true,
    },
    video: false,
  };
}

/** Tarjimon uchun — balandroq va aniqroq yozuv */
export function getInterpreterAudioConstraints(): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    sampleRate: { ideal: 48000, min: 16000 },
    channelCount: { ideal: 1 },
  };
  if (!isAndroidNative()) {
    // @ts-expect-error — Chrome desktop
    audio.voiceIsolation = true;
  }
  return { audio, video: false };
}

export function getMediaConstraints(mobile: boolean): MediaStreamConstraints {
  if (mobile) {
    return {
      video: {
        facingMode: "user",
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 24, max: 30 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };
  }
  return {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  };
}
