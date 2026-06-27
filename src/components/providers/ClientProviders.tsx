"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { CallProvider } from "@/components/providers/CallProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { TelegramInit } from "@/components/TelegramInit";
import { NativeAppInit } from "@/components/NativeAppInit";
import { NativeAppRouter } from "@/components/NativeAppRouter";
import { WebAppInit } from "@/components/WebAppInit";
import { AppSplash } from "@/components/AppSplash";
import { AppLockGate } from "@/components/AppLockGate";
import { ThemeInit } from "@/components/ThemeInit";
import { bootstrapAndroidAuth } from "@/lib/android-auth-bootstrap";
import { readCachedToken, readCachedUser } from "@/lib/auth-cache";

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

  bootstrapAndroidAuth();
  const cachedUser = readCachedUser();
  const cachedToken = readCachedToken();
  const authed = Boolean(user || (cachedUser && cachedToken));

  if (loading && !authed) return <AppSplash />;

  if (!authed) return <>{children}</>;

  const activeUser = user || cachedUser!;

  return (
    <AppLockGate userName={activeUser.name}>
      <LocaleProvider lang={activeUser.language}>
        <CallProvider user={activeUser}>
          <div className="app-page-enter">{children}</div>
        </CallProvider>
      </LocaleProvider>
    </AppLockGate>
  );
}

export function ClientProviders({
  children,
  landing = false,
}: {
  children: React.ReactNode;
  landing?: boolean;
}) {
  if (landing) {
    return <>{children}</>;
  }

  return (
    <AuthProvider>
      <ThemeInit />
      <NativeAppInit />
      <WebAppInit />
      <NativeAppRouter />
      <TelegramInit />
      <CallBridge>{children}</CallBridge>
    </AuthProvider>
  );
}
