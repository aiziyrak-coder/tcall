"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { LANGUAGES } from "@/lib/languages";
import { detectDeviceLanguage } from "@/lib/locale-detect";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordField } from "@/components/auth/PasswordField";
import { scrollInputIntoView } from "@/hooks/useAuthKeyboard";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", name: "", language: "uz" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [langTouched, setLangTouched] = useState(false);

  // Default the language to the user's device language (if supported) on first load.
  useEffect(() => {
    if (langTouched) return;
    const detected = detectDeviceLanguage("uz");
    setForm((f) => (f.language === "uz" ? { ...f, language: detected } : f));
  }, [langTouched]);

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

  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      subtitle="Tilingizni tanlang — tarjima shu tilga bo'ladi"
    >
      <form onSubmit={handleSubmit} className="auth-app-card space-y-5" noValidate>
        {error && <div className="auth-form-error">{error}</div>}

        <AuthField
          name="name"
          label="Ismingiz"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ali Valiyev"
          required
          autoComplete="name"
          enterKeyHint="next"
        />

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
          placeholder="Kamida 6 ta belgi"
          minLength={6}
          maxLength={128}
          required
          autoComplete="new-password"
          enterKeyHint="next"
        />

        <div>
          <label htmlFor="language" className="block text-sm text-slate-600 mb-2">
            Sizning tilingiz
          </label>
          <select
            id="language"
            name="language"
            className="input-field auth-input"
            value={form.language}
            onChange={(e) => { setLangTouched(true); setForm({ ...form, language: e.target.value }); }}
            onFocus={(e) => scrollInputIntoView(e.currentTarget)}
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

        <button type="submit" disabled={loading} className="auth-submit-btn">
          {loading ? "Ro'yxatdan o'tish..." : "Ro'yxatdan o'tish"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-brand-600 font-medium touch-manipulation">
            Kirish
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
