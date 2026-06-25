"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Delete, ShieldCheck, ScanFace, Clock, CheckCircle2, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { markUnlocked } from "@/lib/app-lock";
import { FaceCapture } from "@/components/FaceCapture";

type Mode = "pin" | "recover_intro" | "recover_capture" | "recover_pending" | "recover_rejected" | "recover_setnew";

interface AppLockProps {
  userName?: string;
  onUnlock: () => void;
  onLogout?: () => void;
}

function PinDots({ count, error }: { count: number; error: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-4 ${error ? "animate-[shake_0.4s]" : ""}`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-3.5 h-3.5 rounded-full transition-all ${
            i < count ? (error ? "bg-red-500" : "bg-[#0A84FF]") : "bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

function Keypad({ onDigit, onBackspace, disabled }: { onDigit: (d: string) => void; onBackspace: () => void; disabled?: boolean }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-x-7 gap-y-4 max-w-[300px] mx-auto">
      {keys.map((k, idx) => {
        if (k === "") return <span key={idx} />;
        if (k === "del")
          return (
            <button
              key={idx}
              onClick={onBackspace}
              disabled={disabled}
              className="h-[72px] flex items-center justify-center text-white/80 active:opacity-50 disabled:opacity-30"
              aria-label="O'chirish"
            >
              <Delete size={28} />
            </button>
          );
        return (
          <button
            key={idx}
            onClick={() => onDigit(k)}
            disabled={disabled}
            className="h-[72px] w-[72px] mx-auto rounded-full bg-white/10 active:bg-white/25 text-white text-[28px] font-light transition-colors disabled:opacity-30"
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

export function AppLock({ userName, onUnlock, onLogout }: AppLockProps) {
  const [mode, setMode] = useState<Mode>("pin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  // recovery
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cooldownLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const submitPin = useCallback(async (value: string) => {
    setBusy(true);
    try {
      const r = await apiFetch("/api/security/pin/verify", {
        method: "POST",
        body: JSON.stringify({ pin: value }),
      });
      if (r.ok) {
        markUnlocked();
        onUnlock();
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (r.status === 429 || d.lockedMs) {
        setLockedUntil(Date.now() + (d.lockedMs || 60000));
        setError("Juda ko'p urinish. Biroz kuting.");
      } else {
        const left = typeof d.attemptsLeft === "number" ? d.attemptsLeft : null;
        setError(left != null ? `Noto'g'ri PIN. Qolgan urinish: ${left}` : "Noto'g'ri PIN");
      }
      setPin("");
    } catch {
      setError("Tarmoq xatosi");
      setPin("");
    } finally {
      setBusy(false);
    }
  }, [onUnlock]);

  const handleDigit = useCallback(
    (d: string) => {
      if (busy || cooldownLeft > 0) return;
      setError(null);
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + d;
        if (next.length === 4) void submitPin(next);
        return next;
      });
    },
    [busy, cooldownLeft, submitPin]
  );

  const handleBackspace = useCallback(() => {
    if (busy) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  }, [busy]);

  // --- Recovery ---
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await apiFetch("/api/security/pin/recover");
        if (!r.ok) return;
        const d = await r.json();
        if (d.status === "approved" && d.resetToken) {
          setResetToken(d.resetToken);
          setMode("recover_setnew");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (d.status === "rejected") {
          setMode("recover_rejected");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* ignore */
      }
    }, 5000);
  }, []);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const submitRecovery = useCallback(
    async (image: string, descriptor: number[] | null) => {
      setBusy(true);
      setError(null);
      try {
        const r = await apiFetch("/api/security/pin/recover", {
          method: "POST",
          body: JSON.stringify({ faceImage: image, faceDescriptor: descriptor ?? undefined }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(d.error || "So'rov yuborilmadi");
          setMode("recover_intro");
          return;
        }
        if (d.autoMatched && d.resetToken) {
          setResetToken(d.resetToken);
          setMode("recover_setnew");
        } else {
          setMode("recover_pending");
          startPolling();
        }
      } catch {
        setError("Tarmoq xatosi");
        setMode("recover_intro");
      } finally {
        setBusy(false);
      }
    },
    [startPolling]
  );

  const submitNewPin = useCallback(async () => {
    if (newPin.length !== 4) return setError("PIN 4 raqam bo'lishi kerak");
    if (newPin !== newPin2) return setError("PIN lar mos kelmadi");
    if (!resetToken) return setError("Tiklash tokeni yo'q");
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch("/api/security/pin", {
        method: "POST",
        body: JSON.stringify({ pin: newPin, resetToken }),
      });
      if (r.ok) {
        markUnlocked();
        onUnlock();
        return;
      }
      const d = await r.json().catch(() => ({}));
      setError(d.error || "Xatolik");
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setBusy(false);
    }
  }, [newPin, newPin2, resetToken, onUnlock]);

  // ---- Render ----
  if (mode === "recover_capture") {
    return (
      <FaceCapture
        title="Shaxsni tasdiqlash"
        hint="PINni tiklash uchun yuzingizni skanerlang. Bu dastlab saqlangan yuz bilan solishtiriladi."
        confirmLabel="Yuborish"
        onCapture={({ image, descriptor }) => void submitRecovery(image, descriptor)}
        onCancel={() => setMode("recover_intro")}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[#0b1220] text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-7">
        {mode === "pin" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-[#0A84FF]/15 flex items-center justify-center mb-5">
              <Lock size={30} className="text-[#0A84FF]" />
            </div>
            <h1 className="text-[20px] font-semibold">Tcall qulflangan</h1>
            <p className="mt-1 text-white/50 text-[14px]">
              {userName ? `${userName}, davom etish uchun PIN kiriting` : "Davom etish uchun PIN kiriting"}
            </p>

            <div className="mt-9 mb-2">
              <PinDots count={pin.length} error={!!error} />
            </div>
            <div className="h-6 mt-2">
              {cooldownLeft > 0 ? (
                <p className="text-amber-400 text-[13px]">Qayta urinish: {cooldownLeft}s</p>
              ) : error ? (
                <p className="text-red-400 text-[13px]">{error}</p>
              ) : null}
            </div>

            <div className="mt-6 w-full">
              <Keypad onDigit={handleDigit} onBackspace={handleBackspace} disabled={busy || cooldownLeft > 0} />
            </div>

            <button
              onClick={() => { setError(null); setMode("recover_intro"); }}
              className="mt-8 text-[#0A84FF] text-[14px] font-medium"
            >
              PINni unutdingizmi?
            </button>
          </>
        )}

        {mode === "recover_intro" && (
          <div className="w-full max-w-[340px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0A84FF]/15 flex items-center justify-center mb-5 mx-auto">
              <ScanFace size={30} className="text-[#0A84FF]" />
            </div>
            <h1 className="text-[20px] font-semibold">Yuz orqali tiklash</h1>
            <p className="mt-3 text-white/60 text-[14px] leading-relaxed">
              Yuzingizni skanerlaymiz va PIN o'rnatishda saqlangan yuz bilan solishtiramiz. Mos kelsa, AI avtomatik
              tasdiqlaydi; aks holda admin tekshirib tasdiqlaydi. Shundan so'ng yangi PIN o'rnatasiz.
            </p>
            {error && <p className="mt-4 text-red-400 text-[13px]">{error}</p>}
            <button
              onClick={() => setMode("recover_capture")}
              className="mt-7 w-full py-3.5 rounded-2xl bg-[#0A84FF] text-white font-semibold text-[16px]"
            >
              Yuzni skanerlash
            </button>
            <button onClick={() => { setError(null); setMode("pin"); }} className="mt-3 w-full py-3 text-white/60 text-[15px]">
              Orqaga
            </button>
          </div>
        )}

        {mode === "recover_pending" && (
          <div className="w-full max-w-[340px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/15 flex items-center justify-center mb-5 mx-auto">
              <Clock size={30} className="text-amber-400" />
            </div>
            <h1 className="text-[20px] font-semibold">Tasdiqlash kutilmoqda</h1>
            <p className="mt-3 text-white/60 text-[14px] leading-relaxed">
              So'rovingiz adminga yuborildi. Admin yuzingizni tekshirib tasdiqlagach, shu yerda avtomatik davom etadi.
              Ilovani yopmang yoki keyinroq qaytib keling.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-white/50 text-[13px]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Tekshirilmoqda...
            </div>
            <button onClick={() => setMode("pin")} className="mt-7 w-full py-3 text-white/60 text-[15px]">
              PIN kiritishga qaytish
            </button>
          </div>
        )}

        {mode === "recover_rejected" && (
          <div className="w-full max-w-[340px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mb-5 mx-auto">
              <XCircle size={30} className="text-red-400" />
            </div>
            <h1 className="text-[20px] font-semibold">So'rov rad etildi</h1>
            <p className="mt-3 text-white/60 text-[14px] leading-relaxed">
              Yuz mos kelmadi yoki admin tasdiqlamadi. Qaytadan urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.
            </p>
            <button
              onClick={() => { setError(null); setMode("recover_intro"); }}
              className="mt-7 w-full py-3.5 rounded-2xl bg-[#0A84FF] text-white font-semibold text-[16px]"
            >
              Qayta urinish
            </button>
            <button onClick={() => setMode("pin")} className="mt-3 w-full py-3 text-white/60 text-[15px]">
              Orqaga
            </button>
          </div>
        )}

        {mode === "recover_setnew" && (
          <div className="w-full max-w-[340px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-5 mx-auto">
              <CheckCircle2 size={30} className="text-emerald-400" />
            </div>
            <h1 className="text-[20px] font-semibold">Yangi PIN o'rnatish</h1>
            <p className="mt-2 text-white/60 text-[14px]">Shaxsingiz tasdiqlandi. Yangi 4 xonali PIN kiriting.</p>
            <input
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Yangi PIN"
              className="mt-5 w-full text-center tracking-[0.5em] text-[22px] py-3 rounded-2xl bg-white/10 outline-none"
            />
            <input
              inputMode="numeric"
              pattern="\d*"
              maxLength={4}
              value={newPin2}
              onChange={(e) => setNewPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Takrorlang"
              className="mt-3 w-full text-center tracking-[0.5em] text-[22px] py-3 rounded-2xl bg-white/10 outline-none"
            />
            {error && <p className="mt-3 text-red-400 text-[13px]">{error}</p>}
            <button
              onClick={() => void submitNewPin()}
              disabled={busy}
              className="mt-6 w-full py-3.5 rounded-2xl bg-[#0A84FF] text-white font-semibold text-[16px] disabled:opacity-50"
            >
              {busy ? "Saqlanmoqda..." : "PINni saqlash"}
            </button>
          </div>
        )}
      </div>

      {onLogout && mode === "pin" && (
        <div className="pb-[calc(env(safe-area-inset-bottom)+18px)] flex justify-center">
          <button onClick={onLogout} className="flex items-center gap-1.5 text-white/40 text-[13px]">
            <ShieldCheck size={14} /> Boshqa hisob — Chiqish
          </button>
        </div>
      )}
    </div>
  );
}
