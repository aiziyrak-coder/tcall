"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/** Kirilgan foydalanuvchini login/register dan dashboard ga yo'naltirish */
export function NativeAppRouter() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user && (pathname === "/login" || pathname === "/register")) {
      router.replace("/dashboard");
    }
  }, [pathname, user, loading, router]);

  return null;
}
