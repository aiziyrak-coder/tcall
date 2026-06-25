"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp } from "@/lib/native-app";
import { loadRememberedLogin, saveRememberMe } from "@/lib/remember-login";
import { TcallLogo } from "@/components/TcallLogo";
import { AppSplash } from "@/components/AppSplash";

function LoginForm() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect"));
  const [form, setForm] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = loadRememberedLogin();
    if (saved) {
      setForm((f) => ({ ...f, email: saved.email }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    saveRememberMe(form.email, rememberMe);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, remember: rememberMe || isNativeApp() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) return <AppSplash message="Kirish..." />;
  if (submitting) return <AppSplash message="Kirish..." />;

  return (
    <form onSubmit={handleSubmit} className="auth-app-card space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm text-slate-600 mb-2">Email</label>
        <input
          type="email"
          className="input-field"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="ali@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm text-slate-600">Parol</label>
          <Link href="/forgot-password" className="text-xs font-medium text-brand-600 touch-manipulation">
            Parolni unutdim
          </Link>
        </div>
        <input
          type="password"
          className="input-field"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="current-password"
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-slate-600 touch-manipulation select-none">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Eslab qolish
      </label>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        Kirish
      </button>

      {!isNativeApp() && (
        <p className="text-center text-sm text-slate-500">
          Hisobingiz yo&apos;qmi?{" "}
          <Link href="/register" className="text-brand-600 font-medium touch-manipulation">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </p>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-app-shell app-page-enter">
      <div className="auth-app-scroll">
        <div className="auth-app-inner">
          <div className="flex justify-center mb-8">
            <TcallLogo size="xl" layout="horizontal" title="Kirish" subtitle="Hisobingizga kiring" />
          </div>

          <Suspense fallback={<AppSplash fullscreen={false} />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
