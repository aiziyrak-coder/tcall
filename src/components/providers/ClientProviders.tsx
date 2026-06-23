"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { CallProvider } from "@/components/providers/CallProvider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const needsProvider =
    pathname?.startsWith("/dashboard") || pathname?.startsWith("/call");

  if (!needsProvider || loading || !user) return <>{children}</>;

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
