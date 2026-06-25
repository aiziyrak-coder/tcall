"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { computeFaceDescriptor } from "@/lib/face-api-loader";

interface FaceCaptureProps {
  title?: string;
  hint?: string;
  confirmLabel?: string;
  onCapture: (result: { image: string; descriptor: number[] | null }) => void;
  onCancel: () => void;
}

const SIZE = 480;

export function FaceCapture({ title, hint, confirmLabel, onCapture, onCancel }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [faceFound, setFaceFound] = useState<boolean | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setReady(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Bu qurilmada kamera ishlamayapti.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Kameraga ruxsat berilmadi. Sozlamalardan kameraga ruxsat bering.");
      } else {
        setError("Kamerani ochib bo'lmadi. Boshqa ilova kamerani band qilgan bo'lishi mumkin.");
      }
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth || SIZE;
    const vh = video.videoHeight || SIZE;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, SIZE, SIZE);
    const image = canvas.toDataURL("image/jpeg", 0.82);
    setCaptured(image);
    stopCamera();

    setAnalyzing(true);
    const desc = await computeFaceDescriptor(canvas);
    setDescriptor(desc);
    setFaceFound(desc != null);
    setAnalyzing(false);
  }, [stopCamera]);

  const handleRetake = useCallback(() => {
    setCaptured(null);
    setDescriptor(null);
    setFaceFound(null);
    void startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(() => {
    if (!captured) return;
    onCapture({ image: captured, descriptor });
  }, [captured, descriptor, onCapture]);

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-black/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <button onClick={onCancel} className="text-white/80 text-[15px] font-medium">
          Bekor qilish
        </button>
        <span className="text-white font-semibold text-[15px]">{title || "Yuzni skanerlash"}</span>
        <span className="w-[80px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative w-[280px] h-[280px] rounded-full overflow-hidden ring-4 ring-white/15 bg-black">
          {!captured ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={captured} alt="selfie" className="w-full h-full object-cover scale-x-[-1]" />
          )}
          {!ready && !captured && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              Kamera yuklanmoqda...
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <p className="mt-6 text-center text-white/70 text-[14px] leading-relaxed max-w-[300px]">
          {error
            ? error
            : hint || "Yuzingizni doira ichiga joylang, yaxshi yorug'likda to'g'ridan-to'g'ri qarang."}
        </p>

        {analyzing && (
          <p className="mt-3 text-[#0A84FF] text-[13px] font-medium animate-pulse">AI yuzni tahlil qilmoqda...</p>
        )}
        {!analyzing && faceFound === true && (
          <p className="mt-3 text-emerald-400 text-[13px] font-medium">Yuz aniqlandi ✓</p>
        )}
        {!analyzing && faceFound === false && captured && (
          <p className="mt-3 text-amber-400 text-[13px] font-medium">
            Yuz aniq topilmadi — rasm baribir saqlanadi, admin tekshiradi.
          </p>
        )}
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4 flex flex-col gap-3">
        {error ? (
          <button
            onClick={startCamera}
            className="w-full py-3.5 rounded-2xl bg-[#0A84FF] text-white font-semibold text-[16px]"
          >
            Qayta urinish
          </button>
        ) : !captured ? (
          <button
            onClick={handleCapture}
            disabled={!ready}
            className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-[16px] disabled:opacity-40"
          >
            Suratga olish
          </button>
        ) : (
          <>
            <button
              onClick={handleConfirm}
              disabled={analyzing}
              className="w-full py-3.5 rounded-2xl bg-[#0A84FF] text-white font-semibold text-[16px] disabled:opacity-50"
            >
              {confirmLabel || "Tasdiqlash"}
            </button>
            <button
              onClick={handleRetake}
              disabled={analyzing}
              className="w-full py-3 rounded-2xl bg-white/10 text-white font-medium text-[15px] disabled:opacity-50"
            >
              Qayta olish
            </button>
          </>
        )}
      </div>
    </div>
  );
}
