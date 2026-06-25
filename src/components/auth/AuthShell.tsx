"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { TcallLogo } from "@/components/TcallLogo";
import { useAuthKeyboard } from "@/hooks/useAuthKeyboard";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  logoSize?: "lg" | "xl";
  children: ReactNode;
}

export function AuthShell({ title, subtitle, logoSize = "xl", children }: AuthShellProps) {
  useAuthKeyboard();

  return (
    <div className="auth-app-shell app-page-enter">
      <div className="auth-app-scroll">
        <div className="auth-app-inner">
          <div className="flex justify-center mb-8">
            <TcallLogo size={logoSize} layout="horizontal" title={title} subtitle={subtitle} />
          </div>
          {children}
          <div className="mt-6 flex justify-center gap-4 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-brand-600">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-brand-600">Terms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
