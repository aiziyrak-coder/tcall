let cachedStream: MediaStream | null = null;
let cacheTimer: ReturnType<typeof setTimeout> | null = null;

export function cacheMicStream(stream: MediaStream, ttlMs = 120_000) {
  releaseCachedMicStream();
  cachedStream = stream;
  cacheTimer = setTimeout(releaseCachedMicStream, ttlMs);
}

export function takeCachedMicStream(): MediaStream | null {
  if (cacheTimer) {
    clearTimeout(cacheTimer);
    cacheTimer = null;
  }
  const stream = cachedStream;
  cachedStream = null;
  if (!stream) return null;
  const live = stream.getAudioTracks().some((t) => t.readyState === "live" && t.enabled);
  if (!live) {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
  return stream;
}

export function releaseCachedMicStream() {
  if (cacheTimer) {
    clearTimeout(cacheTimer);
    cacheTimer = null;
  }
  cachedStream?.getTracks().forEach((t) => t.stop());
  cachedStream = null;
}

export function hasCachedMicStream(): boolean {
  return !!cachedStream?.getAudioTracks().some((t) => t.readyState === "live");
}
