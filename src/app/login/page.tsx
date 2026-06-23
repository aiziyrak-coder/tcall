"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Phone } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
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
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

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
          required
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Yuklanmoqda..." : "Kirish"}
      </button>

      <p className="text-center text-sm text-white/50">
        Hisobingiz yo&apos;qmi?{" "}
        <Link href="/register" className="text-brand-400 hover:underline">
          Ro&apos;yxatdan o&apos;tish
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-slate-950 to-slate-950" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">Tcall</span>
          </Link>
          <h1 className="text-2xl font-bold">Kirish</h1>
          <p className="text-white/50 mt-2">Hisobingizga kiring</p>
        </div>

        <Suspense fallback={<div className="glass rounded-2xl p-8 h-64 animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
