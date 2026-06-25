"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Share2, Users, Gift } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ReferralInfo {
  code: string;
  inviteUrl: string;
  referredCount: number;
}

export function InviteModal({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiFetch("/api/user/referral")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setInfo(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = async () => {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const share = async () => {
    if (!info) return;
    const text = "Tcall — dunyo bilan o'z tilingizda gaplashing. Menga qo'shiling:";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Tcall", text, url: info.inviteUrl });
      } else {
        await copy();
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-brand-600" /> Do&apos;stlarni taklif qiling
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-500" aria-label="Yopish">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Havolani ulashing — do&apos;stingiz shu link orqali ro&apos;yxatdan o&apos;tsa, sizning taklifingiz hisoblanadi.
        </p>

        <div className="flex flex-col items-center mb-5">
          <div className="p-3 bg-white rounded-2xl ring-1 ring-slate-200">
            {info ? (
              <QRCodeSVG value={info.inviteUrl} size={168} bgColor="#ffffff" fgColor="#0f172a" level="M" />
            ) : (
              <div className="w-[168px] h-[168px] bg-slate-100 rounded-lg animate-pulse" />
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">QR kodni skanerlab qo&apos;shilish mumkin</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 mb-3">
          <span className="flex-1 text-sm text-slate-700 truncate font-mono">{info?.inviteUrl || "..."}</span>
          <button onClick={copy} className="shrink-0 text-brand-600 p-1.5" aria-label="Nusxalash">
            {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={share}
          className="w-full py-3 rounded-2xl bg-brand-600 text-white font-semibold text-[15px] flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" /> Ulashish
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Users className="w-4 h-4" />
          Siz taklif qilganlar: <b className="text-slate-800">{info?.referredCount ?? 0}</b>
        </div>
      </div>
    </div>
  );
}
