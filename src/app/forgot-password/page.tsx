"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { isNativeApp } from "@/lib/native-app";
import { TcallLogo } from "@/components/TcallLogo";
import { AppCopyright } from "@/components/AppCopyright";

type Step = "email" | "code";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setMessage(data.message || "Kod email manzilingizga yuborildi.");
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
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
    <div className="page-shell app-page-enter">
      <div className="auth-page-scroll flex items-center justify-center px-4 py-8">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-100/50 via-slate-50 to-white pointer-events-none" />
        <div className="relative w-full max-w-lg">
          <div className="flex justify-center mb-8">
            <TcallLogo size="lg" layout="horizontal" title="Parolni tiklash" subtitle="Email orqali kod oling" />
          </div>

          <div className="glass rounded-2xl p-8 space-y-5">
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

            {step === "email" ? (
              <form onSubmit={sendCode} className="space-y-5">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "..." : "Kod yuborish"}
                </button>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">6 xonali kod</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    className="input-field text-center font-mono text-xl tracking-[0.35em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Yangi parol</label>
                  <input
                    type="password"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Parolni tasdiqlang</label>
                  <input
                    type="password"
                    className="input-field"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "..." : "Parolni yangilash"}
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-brand-600 touch-manipulation"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                >
                  Kodni qayta yuborish
                </button>
              </form>
            )}

            <p className="text-center text-sm">
              <Link href="/login" className="text-brand-600 font-medium">
                Login sahifasiga qaytish
              </Link>
            </p>
          </div>

          {!isNativeApp() && <AppCopyright className="mt-8" />}
        </div>
      </div>
    </div>
  );
}
