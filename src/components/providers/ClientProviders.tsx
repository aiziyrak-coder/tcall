"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { CallProvider } from "@/components/providers/CallProvider";

function AppLoading() {
  return (
    <div className="ios-phone-app flex items-center justify-center min-h-[100dvh]">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const needsProvider =
    pathname?.startsWith("/dashboard") || pathname?.startsWith("/call");

  if (!needsProvider) return <>{children}</>;

  if (loading) return <AppLoading />;

  if (!user) return <>{children}</>;

  return (
    <CallProvider
      userId={user.userId}
      userLanguage={user.language}
      translationMode={user.translationMode}
    >
      {children}
    </CallProvider>
  );
}
