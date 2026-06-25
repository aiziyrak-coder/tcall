"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CallError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[call]", error);
  }, [error]);

  return (
    <div className="app-error-page">
      <h1 className="app-error-page-title">Qo&apos;ng&apos;iroq xatosi</h1>
      <p className="app-error-page-text">Ulanishda muammo yuz berdi.</p>
      <div className="app-error-page-actions">
        <button type="button" className="btn-primary btn-compact" onClick={() => reset()}>
          Qayta urinish
        </button>
        <Link href="/dashboard" className="btn-secondary btn-compact">
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}
