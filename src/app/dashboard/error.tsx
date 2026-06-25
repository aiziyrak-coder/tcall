"use client";

import { useEffect } from "react";
import { TcallLogo } from "@/components/TcallLogo";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="app-error-page">
      <TcallLogo size="md" />
      <h1 className="app-error-page-title">Nimadir noto&apos;g&apos;ri ketdi</h1>
      <p className="app-error-page-text">Sahifani qayta yuklang yoki bosh sahifaga qayting.</p>
      <div className="app-error-page-actions">
        <button type="button" className="btn-primary btn-compact" onClick={() => reset()}>
          Qayta urinish
        </button>
        <a href="/dashboard" className="btn-secondary btn-compact">
          Bosh sahifa
        </a>
      </div>
    </div>
  );
}
