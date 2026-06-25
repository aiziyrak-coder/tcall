"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { X, Download, ZoomIn, ZoomOut, Volume2 } from "lucide-react";

interface ChatMediaViewerProps {
  src: string;
  type: "image" | "video" | "audio";
  name?: string;
  onClose: () => void;
}

export function ChatMediaViewer({ src, type, name, onClose }: ChatMediaViewerProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const [closing, setClosing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 220);
  }, [onClose]);

  // ESC klavishi
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = name || "file";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) return;
    setDragStart({ x: e.clientY, y: e.clientY });
    setDragDelta({ x: 0, y: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart || scale > 1) return;
    const dy = e.clientY - dragStart.x;
    setDragDelta({ x: 0, y: dy });
  };

  const handlePointerUp = () => {
    if (dragDelta.y > 80) { close(); return; }
    setDragStart(null);
    setDragDelta({ x: 0, y: 0 });
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setScale(s => s > 1 ? 1 : 2.5);
      setTranslate({ x: 0, y: 0 });
    }
    lastTapRef.current = now;
  };

  const overlayStyle = {
    transform: dragDelta.y ? `translateY(${dragDelta.y}px)` : undefined,
    opacity: dragDelta.y ? Math.max(0.3, 1 - Math.abs(dragDelta.y) / 200) : undefined,
    transition: dragStart ? "none" : "transform 0.22s ease, opacity 0.22s ease",
  };

  return (
    <div
      className={`chat-viewer-overlay ${closing ? "chat-viewer-closing" : ""}`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Header */}
      <div className="chat-viewer-header">
        <span className="chat-viewer-title truncate">{name || (type === "image" ? "Rasm" : type === "video" ? "Video" : "Audio")}</span>
        <div className="flex items-center gap-2">
          {type === "image" && (
            <>
              <button type="button" className="chat-viewer-btn" onClick={() => { setScale(s => Math.min(s + 0.5, 4)); }} disabled={scale >= 4}>
                <ZoomIn className="w-5 h-5" />
              </button>
              <button type="button" className="chat-viewer-btn" onClick={() => { setScale(s => Math.max(s - 0.5, 1)); setTranslate({ x: 0, y: 0 }); }} disabled={scale <= 1}>
                <ZoomOut className="w-5 h-5" />
              </button>
            </>
          )}
          <button type="button" className="chat-viewer-btn" onClick={handleDownload} title="Yuklab olish">
            <Download className="w-5 h-5" />
          </button>
          <button type="button" className="chat-viewer-close" onClick={close} aria-label="Yopish">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="chat-viewer-body"
        style={overlayStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {type === "image" && (
          <img
            src={src}
            alt={name || "rasm"}
            className="chat-viewer-image"
            style={{
              transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
              transition: scale === 1 ? "transform 0.2s ease" : "none",
              cursor: scale > 1 ? "grab" : "default",
            }}
            onClick={handleDoubleTap}
            draggable={false}
          />
        )}

        {type === "video" && (
          <video
            ref={videoRef}
            src={src}
            className="chat-viewer-video"
            controls
            playsInline
            autoPlay
            controlsList="nodownload"
          />
        )}

        {type === "audio" && (
          <div className="chat-viewer-audio-card">
            <Volume2 className="w-10 h-10 text-brand-500 mb-3" />
            <p className="text-slate-600 text-sm font-medium mb-4">{name || "Ovozli xabar"}</p>
            <audio src={src} controls className="w-full" autoPlay />
          </div>
        )}
      </div>

      {/* Swipe hint */}
      {type === "image" && scale === 1 && (
        <p className="chat-viewer-hint">Pastga suring yoki × bosib yoping</p>
      )}
    </div>
  );
}
