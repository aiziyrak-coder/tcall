"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { CallProvider } from "@/components/providers/CallProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { TelegramInit } from "@/components/TelegramInit";
import { NativeAppInit } from "@/components/NativeAppInit";
import { NativeAppRouter } from "@/components/NativeAppRouter";
import { AppSplash } from "@/components/AppSplash";

function CallBridge({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const needsProvider =
    pathname?.startsWith("/dashboard") || pathname?.startsWith("/call");

  useEffect(() => {
    if (needsProvider) {
      router.prefetch("/dashboard");
    }
  }, [needsProvider, router]);

  if (!needsProvider) return <>{children}</>;

  if (loading && !user) return <AppSplash />;

  if (!user) return <>{children}</>;

  return (
    <LocaleProvider lang={user.language}>
      <CallProvider user={user}>
        <div className="app-page-enter">{children}</div>
      </CallProvider>
    </LocaleProvider>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NativeAppInit />
      <NativeAppRouter />
      <TelegramInit />
      <CallBridge>{children}</CallBridge>
    </AuthProvider>
  );
}
