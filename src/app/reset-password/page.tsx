"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { TcallLogo } from "@/components/TcallLogo";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(searchParams.get("email") || "");
    setCode(searchParams.get("code") || "");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setMessage(data.message || "Parol yangilandi.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-app-card space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-700 rounded-xl px-4 py-3 text-sm">
          {message}
        </div>
      )}
      <div>
        <label className="block text-sm text-slate-600 mb-2">Email</label>
        <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm text-slate-600 mb-2">Kod</label>
        <input
          type="text"
          className="input-field text-center font-mono tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-slate-600 mb-2">Yangi parol</label>
        <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
      </div>
      <div>
        <label className="block text-sm text-slate-600 mb-2">Tasdiqlash</label>
        <input type="password" className="input-field" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "..." : "Parolni yangilash"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-brand-600">Login</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-app-shell app-page-enter">
      <div className="auth-app-scroll">
        <div className="auth-app-inner">
          <div className="flex justify-center mb-8">
            <TcallLogo size="lg" layout="horizontal" title="Yangi parol" />
          </div>
          <Suspense fallback={null}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
