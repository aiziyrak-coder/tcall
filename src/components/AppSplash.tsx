"use client";

interface AppSplashProps {
  fullscreen?: boolean;
  message?: string;
}

export function AppSplash({ fullscreen = true }: AppSplashProps) {
  return (
    <div
      className={
        fullscreen
          ? "app-splash app-splash-full app-splash-cosmic"
          : "app-splash app-splash-inline app-splash-cosmic"
      }
      role="status"
      aria-live="polite"
    >
      <div className="cosmic-brand-title">TCall</div>
      <div className="cosmic-brand-subtitle">Translate Calling System</div>
    </div>
  );
}
