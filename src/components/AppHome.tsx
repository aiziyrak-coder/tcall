"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { completeOnboarding, hasCompletedOnboarding } from "@/lib/onboarding";
import { requestAppFullscreen } from "@/lib/app-fullscreen";
import { NativeOnboarding } from "@/components/NativeOnboarding";
import { AppSplash } from "@/components/AppSplash";

/** Kirish nuqtasi: slaydlar → login yoki dashboard */
export function AppHome() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [booted, setBooted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setShowOnboarding(!hasCompletedOnboarding());
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!booted || loading || showOnboarding) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [booted, loading, showOnboarding, user, router]);

  if (!booted) {
    return <AppSplash />;
  }

  if (showOnboarding) {
    return (
      <NativeOnboarding
        onComplete={() => {
          completeOnboarding();
          setShowOnboarding(false);
          void requestAppFullscreen();
          router.replace(user ? "/dashboard" : "/login");
        }}
      />
    );
  }

  if (loading) {
    return <AppSplash />;
  }

  return <AppSplash />;
}
