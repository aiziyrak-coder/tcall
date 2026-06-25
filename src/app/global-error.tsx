"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="uz">
      <body className="app-error-page-body">
        <div className="app-error-page">
          <h1 className="app-error-page-title">Tcall</h1>
          <p className="app-error-page-text">Kutilmagan xatolik yuz berdi.</p>
          <button type="button" className="btn-primary btn-compact" onClick={() => reset()}>
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
