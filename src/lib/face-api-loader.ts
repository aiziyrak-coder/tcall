"use client";

// Lightweight, optional face-recognition support.
// Loads @vladmandic/face-api from a CDN on demand so it never bloats the app
// bundle, and degrades gracefully (returns null) if anything fails. The selfie
// photo is always captured regardless, so admin can verify manually.

const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js";
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

interface FaceApiLike {
  nets: {
    tinyFaceDetector: { loadFromUri: (u: string) => Promise<void>; params?: unknown };
    faceLandmark68Net: { loadFromUri: (u: string) => Promise<void>; params?: unknown };
    faceRecognitionNet: { loadFromUri: (u: string) => Promise<void>; params?: unknown };
  };
  TinyFaceDetectorOptions: new () => unknown;
  detectSingleFace: (input: HTMLCanvasElement | HTMLImageElement, opts: unknown) => {
    withFaceLandmarks: () => { withFaceDescriptor: () => Promise<{ descriptor: Float32Array } | undefined> };
  };
}

declare global {
  interface Window {
    faceapi?: FaceApiLike;
  }
}

let loadPromise: Promise<FaceApiLike | null> | null = null;

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.faceapi) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[data-faceapi]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("faceapi load error")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.dataset.faceapi = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("faceapi load error"));
    document.head.appendChild(s);
  });
}

export async function loadFaceApi(timeoutMs = 12000): Promise<FaceApiLike | null> {
  if (typeof window === "undefined") return null;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const withTimeout = <T>(p: Promise<T>) =>
        Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs))]);

      await withTimeout(injectScript());
      const api = window.faceapi;
      if (!api) return null;
      await withTimeout(
        Promise.all([
          api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
      );
      return api;
    } catch {
      loadPromise = null;
      return null;
    }
  })();
  return loadPromise;
}

/** Returns a 128-d face descriptor for the image, or null if no face / unavailable. */
export async function computeFaceDescriptor(
  input: HTMLCanvasElement | HTMLImageElement
): Promise<number[] | null> {
  try {
    const api = await loadFaceApi();
    if (!api) return null;
    const detection = await api
      .detectSingleFace(input, new api.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection || !detection.descriptor) return null;
    return Array.from(detection.descriptor);
  } catch {
    return null;
  }
}
