"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { useAuth } from "@/hooks/useAuth";
import { cacheToken } from "@/lib/auth-cache";
import { isNativeApp } from "@/lib/native-app";
import { loadRememberedLogin, saveRememberMe } from "@/lib/remember-login";
import { AppSplash } from "@/components/AppSplash";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordField } from "@/components/auth/PasswordField";

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
      if (data.token) cacheToken(data.token);
      setUser(data.user);
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) return <AppSplash message="Kirish..." />;

  return (
    <form onSubmit={handleSubmit} className="auth-app-card space-y-5" noValidate>
      {error && <div className="auth-form-error">{error}</div>}

      <AuthField
        name="email"
        type="email"
        label="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value.trim() })}
        placeholder="ali@example.com"
        required
        autoComplete="email"
        inputMode="email"
        enterKeyHint="next"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />

      <PasswordField
        name="password"
        label="Parol"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
        autoComplete="current-password"
        enterKeyHint="go"
      />

      <p className="text-right -mt-2">
        <Link
          href="/forgot-password"
          className="text-xs font-medium text-brand-600 touch-manipulation inline-flex min-h-[44px] items-center"
        >
          Parolni unutdim
        </Link>
      </p>

      <label
        htmlFor="remember-me"
        className="flex items-center gap-2.5 text-sm text-slate-600 touch-manipulation select-none cursor-pointer min-h-[44px]"
      >
        <input
          id="remember-me"
          name="remember"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        Eslab qolish
      </label>

      <button type="submit" disabled={submitting} className="auth-submit-btn">
        {submitting ? "Kirish..." : "Kirish"}
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
    <AuthShell title="Kirish" subtitle="Hisobingizga kiring">
      <Suspense fallback={<AppSplash fullscreen={false} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
