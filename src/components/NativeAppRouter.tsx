"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp } from "@/lib/native-app";

/** Native ilova: landing o'tkazib, login/dashboard ga yo'naltirish */
export function NativeAppRouter() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!isNativeApp() || loading) return;

    if (pathname === "/") {
      router.replace(user ? "/dashboard" : "/login");
      return;
    }

    if (user && (pathname === "/login" || pathname === "/register")) {
      router.replace("/dashboard");
    }
  }, [pathname, user, loading, router]);

  return null;
}
