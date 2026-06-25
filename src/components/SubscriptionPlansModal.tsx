"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, CreditCard, Crown, Headset, Loader2, X } from "lucide-react";
import { apiFetch, parseApiJson } from "@/lib/api";
import { copyToClipboard } from "@/lib/utils";
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

type PaidPlan = "premium" | "premium_plus";

interface PendingPayment {
  id: string;
  plan: string;
  amount: number;
  baseAmount: number;
  currency: string;
  status: string;
  expiresAt: string;
}

interface CardInfo {
  number: string;
  holder: string;
  bank: string;
}

interface SubscriptionApiPayload {
  error?: string;
  ok?: boolean;
  plan?: ClientSubscriptionPlan;
  prices?: Partial<Record<ClientSubscriptionPlan, number>>;
  pricesUzs?: Partial<Record<PaidPlan, number>>;
  features?: Partial<Record<ClientSubscriptionPlan, string[]>>;
  subscription?: { plan?: ClientSubscriptionPlan; status?: string; expiresAt?: string | null } | null;
  pendingPayment?: PendingPayment | null;
  payment?: PendingPayment | null;
  card?: CardInfo;
  paymentConfigured?: boolean;
  windowMin?: number;
}

const DEFAULT_PRICES_UZS: Record<PaidPlan, number> = { premium: 60_000, premium_plus: 120_000 };

const DEFAULT_FEATURES: Record<ClientSubscriptionPlan, string[]> = {
  free: ["Profil", "Qidirish", "Do'stlar"],
  premium: ["Profil", "Qidirish", "Do'stlar", "Chat", "Push bildirishnomalar"],
  premium_plus: ["Profil", "Qidirish", "Do'stlar", "Chat", "Push bildirishnomalar", "Audio qo'ng'iroq", "AI tarjima", "Tarjimon"],
};

const PLAN_CHOICES: PaidPlan[] = ["premium", "premium_plus"];

const COPY = {
  uz: {
    title: "Obuna va to'lov", subtitle: "Tarifni tanlang va to'lov qiling",
    currentPlan: "Joriy tarif", required: "Bu amal uchun {plan} kerak", activeUntil: "Amal qilish muddati",
    choose: "Tarifni tanlang", included: "Ichida bor", active: "Faol",
    buyNow: "To'lovga o'tish", needHigherPlan: "Davom etish uchun kamida {plan} ni tanlang",
    monthly: "oy", close: "Yopish", back: "Orqaga",
    plan_free: "Bepul", plan_premium: "Premium", plan_premium_plus: "Premium+",
    payTitle: "To'lovni amalga oshiring", payDesc: "Quyidagi kartaga AYNAN ko'rsatilgan summani o'tkazing. To'lov avtomatik tasdiqlanadi.",
    amountLabel: "To'lov summasi (aynan shu)", cardLabel: "Karta raqami", holderLabel: "Karta egasi",
    copy: "Nusxalash", copied: "Nusxalandi", waiting: "To'lov kutilmoqda — avtomatik tekshirilmoqda...",
    timeLeft: "Qolgan vaqt", expired: "Muddat tugadi. Qaytadan urinib ko'ring.", retry: "Qaytadan",
    successPaid: "To'lov qabul qilindi! Obuna yoqildi.",
    exactNote: "DIQQAT! Summani tiyingacha AYNAN ko'rsatilganidek yuboring. Aks holda obuna FAOLLASHMAYDI va pulingiz QAYTARILMAYDI!",
    notConfigured: "To'lov tizimi hozircha sozlanmoqda. Iltimos keyinroq urinib ko'ring yoki admin bilan bog'laning.",
    som: "so'm",
    contact: "Admin bilan bog'lanish", daysLeft: "{n} kun qoldi", expiresWord: "tugaydi",
  },
  ru: {
    title: "Подписка и оплата", subtitle: "Выберите тариф и оплатите",
    currentPlan: "Текущий тариф", required: "Для этого нужен {plan}", activeUntil: "Срок действия",
    choose: "Выберите тариф", included: "Что входит", active: "Активен",
    buyNow: "Перейти к оплате", needHigherPlan: "Выберите минимум {plan}",
    monthly: "мес", close: "Закрыть", back: "Назад",
    plan_free: "Бесплатно", plan_premium: "Premium", plan_premium_plus: "Premium+",
    payTitle: "Произведите оплату", payDesc: "Переведите ТОЧНО указанную сумму на карту. Оплата подтвердится автоматически.",
    amountLabel: "Сумма оплаты (именно эта)", cardLabel: "Номер карты", holderLabel: "Владелец карты",
    copy: "Копировать", copied: "Скопировано", waiting: "Ожидание оплаты — проверяем автоматически...",
    timeLeft: "Осталось", expired: "Время истекло. Попробуйте снова.", retry: "Заново",
    successPaid: "Оплата принята! Подписка активирована.",
    exactNote: "ВНИМАНИЕ! Отправьте сумму ТОЧНО до тийина, как указано. Иначе подписка НЕ активируется и деньги НЕ возвращаются!",
    notConfigured: "Платёжная система настраивается. Попробуйте позже или свяжитесь с админом.",
    som: "сум",
    contact: "Связаться с админом", daysLeft: "осталось {n} дн.", expiresWord: "истекает",
  },
  en: {
    title: "Subscription & Payment", subtitle: "Choose a plan and pay",
    currentPlan: "Current plan", required: "This requires {plan}", activeUntil: "Valid until",
    choose: "Choose a plan", included: "Included", active: "Active",
    buyNow: "Continue to payment", needHigherPlan: "Choose at least {plan}",
    monthly: "month", close: "Close", back: "Back",
    plan_free: "Free", plan_premium: "Premium", plan_premium_plus: "Premium+",
    payTitle: "Make the payment", payDesc: "Transfer the EXACT amount shown to the card. Payment is confirmed automatically.",
    amountLabel: "Payment amount (exactly this)", cardLabel: "Card number", holderLabel: "Card holder",
    copy: "Copy", copied: "Copied", waiting: "Waiting for payment — checking automatically...",
    timeLeft: "Time left", expired: "Time expired. Please try again.", retry: "Retry",
    successPaid: "Payment received! Subscription activated.",
    exactNote: "WARNING! Send the EXACT amount down to the tiyin as shown. Otherwise the subscription will NOT activate and your money is NON-REFUNDABLE!",
    notConfigured: "Payment system is being set up. Please try later or contact admin.",
    som: "UZS",
    contact: "Contact support", daysLeft: "{n} days left", expiresWord: "expires",
  },
} as const;

function getCopy(lang: string) {
  const code = lang.split("-")[0].toLowerCase();
  if (code === "uz") return COPY.uz;
  if (code === "ru") return COPY.ru;
  return COPY.en;
}

function formatSom(n: number): string {
  return n.toLocaleString("ru-RU").replace(/,/g, " ");
}

export function SubscriptionPlansModal({
  open, userLanguage, requiredPlan, currentPlanHint, errorHint, onClose,
}: SubscriptionPlansModalProps) {
  const copy = getCopy(userLanguage);
  const [step, setStep] = useState<"plans" | "pay">("plans");
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPlan, setCurrentPlan] = useState<ClientSubscriptionPlan>(currentPlanHint || "free");
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>(
    requiredPlan === "premium_plus" ? "premium_plus" : "premium"
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pricesUzs, setPricesUzs] = useState<Record<PaidPlan, number>>(DEFAULT_PRICES_UZS);
  const [features, setFeatures] = useState<Record<ClientSubscriptionPlan, string[]>>(DEFAULT_FEATURES);
  const [payment, setPayment] = useState<PendingPayment | null>(null);
  const [card, setCard] = useState<CardInfo>({ number: "", holder: "", bank: "" });
  const [configured, setConfigured] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copiedField, setCopiedField] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const required = useMemo(() => (requiredPlan && requiredPlan !== "free" ? requiredPlan : undefined), [requiredPlan]);

  const planLabel = (plan: ClientSubscriptionPlan) =>
    plan === "premium_plus" ? copy.plan_premium_plus : plan === "premium" ? copy.plan_premium : copy.plan_free;

  const applyPayload = useCallback((data: SubscriptionApiPayload) => {
    if (data.plan) setCurrentPlan(data.plan);
    if (data.subscription?.expiresAt) setExpiresAt(data.subscription.expiresAt); else setExpiresAt(null);
    if (data.pricesUzs) {
      setPricesUzs((prev) => ({
        premium: typeof data.pricesUzs?.premium === "number" ? data.pricesUzs.premium : prev.premium,
        premium_plus: typeof data.pricesUzs?.premium_plus === "number" ? data.pricesUzs.premium_plus : prev.premium_plus,
      }));
    }
    if (data.features) {
      setFeatures((prev) => ({
        free: prev.free,
        premium: Array.isArray(data.features?.premium) && data.features.premium.length ? data.features.premium : prev.premium,
        premium_plus: Array.isArray(data.features?.premium_plus) && data.features.premium_plus.length ? data.features.premium_plus : prev.premium_plus,
      }));
    }
    if (data.card) setCard(data.card);
    if (typeof data.paymentConfigured === "boolean") setConfigured(data.paymentConfigured);
  }, []);

  // Boshlang'ich yuklash
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(errorHint || "");
    setSuccess("");
    setStep("plans");
    setPayment(null);
    if (required) setSelectedPlan(required === "premium_plus" ? "premium_plus" : "premium");
    if (currentPlanHint) setCurrentPlan(currentPlanHint);

    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/subscription");
        const data = await parseApiJson<SubscriptionApiPayload>(res);
        if (!res.ok) throw new Error(data.error || "Yuklash xatosi");
        if (cancelled) return;
        applyPayload(data);
        // Mavjud kutilayotgan to'lov bo'lsa — to'g'ridan-to'g'ri to'lov bosqichiga
        if (data.pendingPayment) {
          setPayment(data.pendingPayment);
          setSelectedPlan(data.pendingPayment.plan === "premium_plus" ? "premium_plus" : "premium");
          setStep("pay");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Xatolik");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, required, currentPlanHint, errorHint, applyPayload]);

  // Sanoq (countdown)
  useEffect(() => {
    if (step !== "pay" || !payment) return;
    const tick = () => {
      const ms = new Date(payment.expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step, payment]);

  // Holatni poll qilish — to'lov tasdiqlanganini avtomatik aniqlash
  useEffect(() => {
    if (step !== "pay" || !payment || success) return;
    const check = async () => {
      try {
        const res = await apiFetch("/api/subscription");
        const data = await parseApiJson<SubscriptionApiPayload>(res);
        if (!res.ok) return;
        if (data.plan) setCurrentPlan(data.plan);
        // To'lov tasdiqlandi: kutilayotgan to'lov yo'qoldi va plan mos keldi
        if (data.plan === payment.plan && !data.pendingPayment) {
          setSuccess(copy.successPaid);
          if (data.subscription?.expiresAt) setExpiresAt(data.subscription.expiresAt);
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(onClose, 2200);
        }
      } catch { /* ignore */ }
    };
    pollRef.current = setInterval(check, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, payment, success, copy.successPaid, onClose]);

  if (!open) return null;

  const selectedPlanEnough = required ? isPlanSufficient(selectedPlan, required) : true;

  const startPayment = async () => {
    if (buying) return;
    if (!selectedPlanEnough && required) {
      setError(copy.needHigherPlan.replace("{plan}", planLabel(required)));
      return;
    }
    setBuying(true); setError(""); setSuccess("");
    try {
      const res = await apiFetch("/api/subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await parseApiJson<SubscriptionApiPayload>(res);
      if (!res.ok || !data.payment) throw new Error(data.error || "To'lov yaratilmadi");
      applyPayload(data);
      setPayment(data.payment);
      setStep("pay");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBuying(false);
    }
  };

  const doCopy = async (field: string, value: string) => {
    const ok = await copyToClipboard(value);
    if (ok) { setCopiedField(field); setTimeout(() => setCopiedField(""), 1500); }
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const expired = step === "pay" && secondsLeft <= 0 && !success;

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel max-w-xl w-[94vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{step === "pay" ? copy.payTitle : copy.title}</h3>
            <p className="text-sm text-slate-500">{step === "pay" ? copy.payDesc : copy.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label={copy.close}><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2"><Check className="w-4 h-4" />{success}</div>}

        {/* ── PLANS ── */}
        {step === "plans" && (
          <>
            {required && (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {copy.required.replace("{plan}", planLabel(required))}
              </div>
            )}

            <div className="mb-4 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">{copy.currentPlan}</p>
                  <p className="text-sm font-semibold text-slate-900">{planLabel(currentPlan)}</p>
                </div>
                {currentPlan !== "free" && expiresAt && (() => {
                  const days = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
                  return (
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${days <= 3 ? "bg-red-100 text-red-700" : days <= 7 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {copy.daysLeft.replace("{n}", String(days))}
                      </span>
                    </div>
                  );
                })()}
              </div>
              {expiresAt && (
                <p className="text-xs text-slate-500 mt-2">{copy.activeUntil}: {new Date(expiresAt).toLocaleDateString()}</p>
              )}
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{copy.choose}</p>

            {loading ? (
              <div className="py-8 flex items-center justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {PLAN_CHOICES.map((plan) => {
                  const selected = selectedPlan === plan;
                  const active = currentPlan === plan;
                  const blockedByRequired = required != null && !isPlanSufficient(plan, required);
                  return (
                    <button key={plan} type="button" onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left rounded-2xl border p-3 transition ${selected ? "border-brand-500 bg-brand-50/60" : "border-black/10 bg-white"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center"><Crown className="w-4 h-4" /></span>
                          <div>
                            <p className="font-semibold text-slate-900">{planLabel(plan)}</p>
                            <p className="text-xs text-slate-500">{formatSom(pricesUzs[plan])} {copy.som}/{copy.monthly}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="w-3.5 h-3.5" />{copy.active}</span>
                          ) : blockedByRequired ? (
                            <span className="text-[11px] text-amber-700">{copy.required.replace("{plan}", planLabel(required ?? "premium"))}</span>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 mt-2 mb-1">{copy.included}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {features[plan].map((f) => (
                          <span key={`${plan}-${f}`} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{f}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button type="button" onClick={() => void startPayment()} disabled={buying || loading}
              className="btn-primary btn-compact w-full mt-4 flex items-center justify-center gap-2">
              {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {`${copy.buyNow} (${formatSom(pricesUzs[selectedPlan])} ${copy.som})`}
            </button>

            <button
              type="button"
              onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent("tcall:open-support")), 100); }}
              className="btn-secondary btn-compact w-full mt-2 flex items-center justify-center gap-2"
            >
              <Headset className="w-4 h-4" /> {copy.contact}
            </button>
          </>
        )}

        {/* ── PAYMENT ── */}
        {step === "pay" && payment && (
          <div>
            {!configured && (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{copy.notConfigured}</div>
            )}

            <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 mb-3">
              <p className="text-xs text-slate-500">{copy.amountLabel}</p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-2xl font-bold font-mono text-brand-700">{formatSom(payment.amount)} <span className="text-base text-slate-500">{copy.som}</span></p>
                <button type="button" onClick={() => void doCopy("amount", String(payment.amount))} className="btn-secondary btn-compact text-xs flex items-center gap-1">
                  {copiedField === "amount" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === "amount" ? copy.copied : copy.copy}
                </button>
              </div>
            </div>

            <div className="payment-warning rounded-2xl border-2 border-red-500 bg-red-50 p-3.5 mb-3 flex items-start gap-2.5">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-bold text-red-700 leading-snug">{copy.exactNote}</p>
            </div>

            {card.number && (
              <div className="rounded-2xl border border-black/10 bg-white p-4 mb-3 space-y-2">
                <div>
                  <p className="text-xs text-slate-500">{copy.cardLabel}{card.bank ? ` · ${card.bank}` : ""}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-lg font-mono font-semibold tracking-wider text-slate-900">{card.number}</p>
                    <button type="button" onClick={() => void doCopy("card", card.number.replace(/\s/g, ""))} className="btn-secondary btn-compact text-xs flex items-center gap-1">
                      {copiedField === "card" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === "card" ? copy.copied : copy.copy}
                    </button>
                  </div>
                </div>
                {card.holder && (
                  <div>
                    <p className="text-xs text-slate-500">{copy.holderLabel}</p>
                    <p className="text-sm font-medium text-slate-800">{card.holder}</p>
                  </div>
                )}
              </div>
            )}

            {expired ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-sm text-red-700 mb-3">{copy.expired}</p>
                <button type="button" onClick={() => { setStep("plans"); setPayment(null); }} className="btn-primary btn-compact">{copy.retry}</button>
              </div>
            ) : (
              <div className="rounded-2xl border border-black/5 bg-slate-50 p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-brand-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{copy.waiting}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{copy.timeLeft}: {mm}:{ss.toString().padStart(2, "0")}</p>
                </div>
              </div>
            )}

            {!expired && (
              <button type="button" onClick={() => { setStep("plans"); }} className="btn-secondary btn-compact w-full mt-3">{copy.back}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
