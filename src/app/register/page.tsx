"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { useAuth } from "@/hooks/useAuth";
import { TcallLogo } from "@/components/TcallLogo";
import { AppSplash } from "@/components/AppSplash";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", name: "", language: "uz" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <AppSplash message="Ro'yxatdan o'tish..." />
      </div>
    );
  }

  return (
    <div className="page-shell flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-100/50 via-slate-50 to-white pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 mb-6">
            <TcallLogo size="lg" showTagline />
          </Link>
          <h1 className="text-2xl font-bold">Ro&apos;yxatdan o&apos;tish</h1>
          <p className="text-slate-500 mt-2">Tilingizni tanlang — tarjima shu tilga bo&apos;ladi</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-600 mb-2">Ismingiz</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ali Valiyev"
              required
            />
          </div>

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
              placeholder="Kamida 6 ta belgi"
              minLength={6}
              maxLength={128}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">Sizning tilingiz</label>
            <select
              className="input-field"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              Boshqalar gapirganda tarjima shu tilga keladi
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            Ro&apos;yxatdan o&apos;tish
          </button>

          <p className="text-center text-sm text-slate-500">
            Hisobingiz bormi?{" "}
            <Link href="/login" className="text-brand-600 hover:underline">
              Kirish
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
