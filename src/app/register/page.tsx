"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";

export default function RegisterPage() {
  const router = useRouter();
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
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Tcall</span>
          </Link>
          <h1 className="text-2xl font-bold">Ro&apos;yxatdan o&apos;tish</h1>
          <p className="text-white/50 mt-2">Tilingizni tanlang — tarjima shu tilga bo&apos;ladi</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-2">Ismingiz</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ali Valiyev"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Email</label>
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
            <label className="block text-sm text-white/60 mb-2">Parol</label>
            <input
              type="password"
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Kamida 6 ta belgi"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Sizning tilingiz</label>
            <select
              className="input-field"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900">
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/40 mt-1.5">
              Boshqalar gapirganda tarjima shu tilga keladi
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
          </button>

          <p className="text-center text-sm text-white/50">
            Hisobingiz bormi?{" "}
            <Link href="/login" className="text-brand-400 hover:underline">
              Kirish
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
