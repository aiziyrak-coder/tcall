"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Loader2, X } from "lucide-react";
import { apiFetch, parseApiJson } from "@/lib/api";
import {
  isPlanSufficient,
  type ClientSubscriptionPlan,
} from "@/lib/subscription-required";

interface SubscriptionPlansModalProps {
  open: boolean;
  userLanguage: string;
  requiredPlan?: ClientSubscriptionPlan;
  currentPlanHint?: ClientSubscriptionPlan;
  errorHint?: string;
  onClose: () => void;
}

interface SubscriptionApiPayload {
  error?: string;
  plan?: ClientSubscriptionPlan;
  prices?: Partial<Record<ClientSubscriptionPlan, number>>;
  features?: Partial<Record<ClientSubscriptionPlan, string[]>>;
  subscription?: {
    plan?: ClientSubscriptionPlan;
    status?: string;
    expiresAt?: string | null;
  } | null;
}

const DEFAULT_PRICES: Record<ClientSubscriptionPlan, number> = {
  free: 0,
  premium: 4.99,
  premium_plus: 9.99,
};

const DEFAULT_FEATURES: Record<ClientSubscriptionPlan, string[]> = {
  free: ["Profil", "Qidirish", "Do'stlar"],
  premium: ["Profil", "Qidirish", "Do'stlar", "Chat", "Push bildirishnomalar"],
  premium_plus: [
    "Profil",
    "Qidirish",
    "Do'stlar",
    "Chat",
    "Push bildirishnomalar",
    "Audio qo'ng'iroq",
    "AI tarjima",
    "Tarjimon",
  ],
};

const PLAN_CHOICES: ClientSubscriptionPlan[] = ["premium", "premium_plus"];

const COPY = {
  uz: {
    title: "Obuna va to'lov",
    subtitle: "Premium funksiyalarni darhol yoqing",
    currentPlan: "Joriy tarif",
    required: "Bu amal uchun {plan} kerak",
    activeUntil: "Amal qilish muddati",
    choose: "Tarifni tanlang",
    included: "Ichida bor",
    active: "Faol",
    buyNow: "Obuna sotib olish",
    processing: "Faollashtirilmoqda...",
    success: "Obuna muvaffaqiyatli yoqildi",
    needHigherPlan: "Davom etish uchun kamida {plan} ni tanlang",
    monthly: "oy",
    close: "Yopish",
    plan_free: "Bepul",
    plan_premium: "Premium",
    plan_premium_plus: "Premium+",
  },
  ru: {
    title: "Подписка и оплата",
    subtitle: "Включите Premium функции сразу",
    currentPlan: "Текущий тариф",
    required: "Для этого действия нужен {plan}",
    activeUntil: "Срок действия",
    choose: "Выберите тариф",
    included: "Что входит",
    active: "Активен",
    buyNow: "Купить подписку",
    processing: "Активация...",
    success: "Подписка успешно активирована",
    needHigherPlan: "Для продолжения выберите минимум {plan}",
    monthly: "мес",
    close: "Закрыть",
    plan_free: "Бесплатно",
    plan_premium: "Premium",
    plan_premium_plus: "Premium+",
  },
  en: {
    title: "Subscription & Payment",
    subtitle: "Unlock premium features instantly",
    currentPlan: "Current plan",
    required: "This action requires {plan}",
    activeUntil: "Valid until",
    choose: "Choose a plan",
    included: "Included features",
    active: "Active",
    buyNow: "Buy subscription",
    processing: "Activating...",
    success: "Subscription activated successfully",
    needHigherPlan: "Choose at least {plan} to continue",
    monthly: "month",
    close: "Close",
    plan_free: "Free",
    plan_premium: "Premium",
    plan_premium_plus: "Premium+",
  },
} as const;

function getCopy(lang: string) {
  const code = lang.split("-")[0].toLowerCase();
  if (code === "uz") return COPY.uz;
  if (code === "ru") return COPY.ru;
  return COPY.en;
}

function formatUsd(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function SubscriptionPlansModal({
  open,
  userLanguage,
  requiredPlan,
  currentPlanHint,
  errorHint,
  onClose,
}: SubscriptionPlansModalProps) {
  const copy = getCopy(userLanguage);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPlan, setCurrentPlan] = useState<ClientSubscriptionPlan>(
    currentPlanHint || "free"
  );
  const [selectedPlan, setSelectedPlan] = useState<ClientSubscriptionPlan>(
    requiredPlan && requiredPlan !== "free" ? requiredPlan : "premium"
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [prices, setPrices] =
    useState<Record<ClientSubscriptionPlan, number>>(DEFAULT_PRICES);
  const [features, setFeatures] =
    useState<Record<ClientSubscriptionPlan, string[]>>(DEFAULT_FEATURES);

  const required = useMemo(() => {
    if (!requiredPlan || requiredPlan === "free") return undefined;
    return requiredPlan;
  }, [requiredPlan]);

  const planLabel = (plan: ClientSubscriptionPlan) => {
    if (plan === "premium_plus") return copy.plan_premium_plus;
    if (plan === "premium") return copy.plan_premium;
    return copy.plan_free;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setError(errorHint || "");
    setSuccess("");
    if (required && !isPlanSufficient(selectedPlan, required)) {
      setSelectedPlan(required);
    }
    if (currentPlanHint) {
      setCurrentPlan(currentPlanHint);
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/subscription");
        const data = await parseApiJson<SubscriptionApiPayload>(res);
        if (!res.ok) throw new Error(data.error || "Failed to load subscription");
        if (cancelled) return;

        if (data.plan) setCurrentPlan(data.plan);
        if (data.subscription?.expiresAt) {
          setExpiresAt(data.subscription.expiresAt);
        } else {
          setExpiresAt(null);
        }

        if (data.prices) {
          setPrices((prev) => ({
            free: typeof data.prices?.free === "number" ? data.prices.free : prev.free,
            premium:
              typeof data.prices?.premium === "number"
                ? data.prices.premium
                : prev.premium,
            premium_plus:
              typeof data.prices?.premium_plus === "number"
                ? data.prices.premium_plus
                : prev.premium_plus,
          }));
        }

        if (data.features) {
          setFeatures((prev) => ({
            free:
              Array.isArray(data.features?.free) && data.features.free.length > 0
                ? data.features.free
                : prev.free,
            premium:
              Array.isArray(data.features?.premium) && data.features.premium.length > 0
                ? data.features.premium
                : prev.premium,
            premium_plus:
              Array.isArray(data.features?.premium_plus) &&
              data.features.premium_plus.length > 0
                ? data.features.premium_plus
                : prev.premium_plus,
          }));
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Subscription load error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, required, currentPlanHint, errorHint]);

  if (!open) return null;

  const selectedPlanEnough = required
    ? isPlanSufficient(selectedPlan, required)
    : true;

  const buy = async () => {
    if (buying) return;
    if (!selectedPlanEnough && required) {
      setError(copy.needHigherPlan.replace("{plan}", planLabel(required)));
      return;
    }

    setBuying(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await parseApiJson<SubscriptionApiPayload>(res);
      if (!res.ok) throw new Error(data.error || "Subscription purchase failed");

      if (data.plan) setCurrentPlan(data.plan);
      if (data.subscription?.expiresAt) setExpiresAt(data.subscription.expiresAt);
      setSuccess(copy.success);
      setTimeout(onClose, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subscription purchase failed");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel max-w-xl w-[94vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{copy.title}</h3>
            <p className="text-sm text-slate-500">{copy.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label={copy.close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {required && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {copy.required.replace("{plan}", planLabel(required))}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">{copy.currentPlan}</p>
          <p className="text-sm font-semibold text-slate-900">{planLabel(currentPlan)}</p>
          {expiresAt && (
            <p className="text-xs text-slate-500 mt-1">
              {copy.activeUntil}: {new Date(expiresAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          {copy.choose}
        </p>

        {loading ? (
          <div className="py-8 flex items-center justify-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {PLAN_CHOICES.map((plan) => {
              const selected = selectedPlan === plan;
              const active = currentPlan === plan;
              const blockedByRequired =
                required != null && !isPlanSufficient(plan, required);
              return (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full text-left rounded-2xl border p-3 transition ${
                    selected
                      ? "border-brand-500 bg-brand-50/60"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center">
                        <Crown className="w-4 h-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{planLabel(plan)}</p>
                        <p className="text-xs text-slate-500">
                          {formatUsd(prices[plan])}/{copy.monthly}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Check className="w-3.5 h-3.5" />
                          {copy.active}
                        </span>
                      ) : blockedByRequired ? (
                        <span className="text-[11px] text-amber-700">
                          {copy.required.replace("{plan}", planLabel(required ?? "premium"))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mt-2 mb-1">
                    {copy.included}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {features[plan].map((feature) => (
                      <span
                        key={`${plan}-${feature}`}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => void buy()}
          disabled={buying || loading}
          className="btn-primary btn-compact w-full mt-4 flex items-center justify-center gap-2"
        >
          {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
          {buying
            ? copy.processing
            : `${copy.buyNow} (${formatUsd(prices[selectedPlan])}/${copy.monthly})`}
        </button>
      </div>
    </div>
  );
}
