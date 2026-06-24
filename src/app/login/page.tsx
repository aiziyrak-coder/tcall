"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { useAuth } from "@/hooks/useAuth";
import { TcallLogo } from "@/components/TcallLogo";
import { AppSplash } from "@/components/AppSplash";
import { AppCopyright } from "@/components/AppCopyright";

function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get("redirect"));
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <AppSplash message="Kirish..." />;

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
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
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-2">Parol</label>
        <input
          type="password"
          className="input-field"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        Kirish
      </button>

      <p className="text-center text-sm text-slate-500">
        Hisobingiz yo&apos;qmi?{" "}
        <Link href="/register" className="text-brand-600 hover:underline">
          Ro&apos;yxatdan o&apos;tish
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="page-shell app-page-enter flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-100/50 via-slate-50 to-white pointer-events-none" />
      <div className="relative w-full max-w-lg">
        <div className="flex justify-center mb-8 sm:mb-10">
          <Link href="/" className="touch-manipulation">
            <TcallLogo
              size="xl"
              layout="horizontal"
              title="Kirish"
              subtitle="Hisobingizga kiring"
            />
          </Link>
        </div>

        <Suspense fallback={<AppSplash fullscreen={false} />}>
          <LoginForm />
        </Suspense>

        <AppCopyright className="mt-8" />
      </div>
    </div>
  );
}
