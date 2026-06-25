"use client";

/** Kichik, nafis toast — hamma xabarlar shu orqali */
import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/* ── Reconnect pill ── */
interface ReconnectPillProps {
  visible: boolean;
  label?: string;
}

export function ReconnectPill({ visible, label }: ReconnectPillProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShow(true);
    } else {
      const t = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div
      className={`app-status-pill ${visible ? "app-status-pill-in" : "app-status-pill-out"}`}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-3 h-3" />
      <span>{label ?? "Ulanmoqda..."}</span>
    </div>
  );
}

/* ── Hint pill (green notification) ── */
interface HintPillProps {
  message: string | null;
}

export function HintPill({ message }: HintPillProps) {
  const [show, setShow] = useState(!!message);
  const [text, setText] = useState(message);

  useEffect(() => {
    if (message) {
      setText(message);
      setShow(true);
    } else {
      const t = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (!show) return null;

  return (
    <div className={`app-status-pill app-status-pill-green ${message ? "app-status-pill-in" : "app-status-pill-out"}`} role="status">
      <span>{text}</span>
    </div>
  );
}

/* ── Error toast (top center, auto-dismiss) ── */
interface ErrorToastProps {
  message: string | null;
  type?: "error" | "warn";
}

export function ErrorToast({ message, type = "error" }: ErrorToastProps) {
  const [visible, setVisible] = useState(!!message);
  const [text, setText] = useState(message);

  useEffect(() => {
    if (message) {
      setText(message);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [message]);

  if (!text) return null;

  return (
    <div
      className={`app-error-toast ${type === "warn" ? "app-error-toast-warn" : ""} ${visible ? "app-error-toast-in" : "app-error-toast-out"}`}
      role="alert"
    >
      {text}
    </div>
  );
}
