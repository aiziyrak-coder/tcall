"use client";

export type ClientSubscriptionPlan = "free" | "premium" | "premium_plus";

export interface SubscriptionRequiredDetail {
  requiredPlan: ClientSubscriptionPlan;
  currentPlan?: ClientSubscriptionPlan;
  error?: string;
  source?: string;
}

const EVENT_NAME = "tcall:subscription-required";
const PLAN_ORDER: ClientSubscriptionPlan[] = ["free", "premium", "premium_plus"];

function normalizePlan(value: unknown): ClientSubscriptionPlan | undefined {
  if (typeof value !== "string") return undefined;
  const lower = value.trim().toLowerCase();
  if (lower === "free") return "free";
  if (lower === "premium") return "premium";
  if (lower === "premium_plus" || lower === "premium+" || lower === "premium plus") {
    return "premium_plus";
  }
  return undefined;
}

function inferPlanFromError(error?: string): ClientSubscriptionPlan | undefined {
  if (!error) return undefined;
  const lower = error.toLowerCase();
  if (lower.includes("premium+") || lower.includes("premium_plus") || lower.includes("premium plus")) {
    return "premium_plus";
  }
  if (lower.includes("premium")) return "premium";
  return undefined;
}

export function isPlanSufficient(
  plan: ClientSubscriptionPlan,
  requiredPlan: ClientSubscriptionPlan
): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(requiredPlan);
}

export function extractSubscriptionRequirement(
  status: number,
  payload: unknown
): SubscriptionRequiredDetail | null {
  if (status !== 402) return null;
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const error = typeof body.error === "string" ? body.error : undefined;

  const requiredPlan =
    normalizePlan(body.requiresPlan ?? body.requiredPlan) ??
    inferPlanFromError(error) ??
    "premium";
  const currentPlan = normalizePlan(body.currentPlan ?? body.plan);

  return {
    requiredPlan,
    currentPlan,
    error,
  };
}

export function emitSubscriptionRequired(detail: SubscriptionRequiredDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SubscriptionRequiredDetail>(EVENT_NAME, { detail }));
}

export function onSubscriptionRequired(
  handler: (detail: SubscriptionRequiredDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const listener: EventListener = (event) => {
    const detail = (event as CustomEvent<SubscriptionRequiredDetail>).detail;
    if (!detail?.requiredPlan) return;
    handler(detail);
  };

  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
