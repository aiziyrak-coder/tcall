"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordField } from "@/components/auth/PasswordField";

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
    <form onSubmit={handleSubmit} className="auth-app-card space-y-4" noValidate>
      {error && <div className="auth-form-error">{error}</div>}
      {message && <div className="auth-form-success">{message}</div>}

      <AuthField
        name="email"
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        inputMode="email"
        enterKeyHint="next"
      />

      <AuthField
        name="code"
        type="text"
        label="Kod"
        className="text-center font-mono tracking-widest"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        maxLength={6}
        inputMode="numeric"
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
        label="Tasdiqlash"
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

      <p className="text-center text-sm">
        <Link href="/login" className="text-brand-600 font-medium touch-manipulation inline-flex min-h-[44px] items-center justify-center w-full">
          Login sahifasiga qaytish
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Yangi parol" logoSize="lg">
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
