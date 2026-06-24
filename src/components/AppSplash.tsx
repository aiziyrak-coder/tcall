"use client";

import { TcallLogo } from "@/components/TcallLogo";

interface AppSplashProps {
  fullscreen?: boolean;
  message?: string;
}

export function AppSplash({ fullscreen = true, message }: AppSplashProps) {
  return (
    <div
      className={
        fullscreen
          ? "app-splash app-splash-full"
          : "app-splash app-splash-inline"
      }
      role="status"
      aria-live="polite"
    >
      <TcallLogo
        size="splash"
        animate
        layout="horizontal"
        showTagline
        subtitle={message}
      />
    </div>
  );
}
