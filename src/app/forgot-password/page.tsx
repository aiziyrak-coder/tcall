"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordField } from "@/components/auth/PasswordField";

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
        body: JSON.stringify({ email: email.trim() }),
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

  const resendCode = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setCode("");
      setMessage(data.message || "Kod qayta yuborildi.");
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
        body: JSON.stringify({ email: email.trim(), code, password }),
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
    <AuthShell title="Parolni tiklash" subtitle="Email orqali kod oling" logoSize="lg">
      <div className="auth-app-card space-y-5">
        {error && <div className="auth-form-error">{error}</div>}
        {message && <div className="auth-form-success">{message}</div>}

        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-5" noValidate>
            <AuthField
              name="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              enterKeyHint="go"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? "Yuborilmoqda..." : "Kod yuborish"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4" noValidate>
            <AuthField
              name="code"
              type="text"
              label="6 xonali kod"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              className="text-center font-mono text-xl tracking-[0.35em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoComplete="one-time-code"
              enterKeyHint="next"
            />
            <PasswordField
              name="password"
              label="Yangi parol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
              enterKeyHint="next"
            />
            <PasswordField
              name="confirm"
              label="Parolni tasdiqlang"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
              enterKeyHint="go"
            />
            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? "Saqlanmoqda..." : "Parolni yangilash"}
            </button>
            <button
              type="button"
              className="w-full text-sm text-brand-600 touch-manipulation disabled:opacity-50 min-h-[44px]"
              disabled={loading || !email}
              onClick={() => void resendCode()}
            >
              {loading ? "..." : "Kodni qayta yuborish"}
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="text-brand-600 font-medium touch-manipulation inline-flex min-h-[44px] items-center">
            Login sahifasiga qaytish
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
