const ONBOARDING_KEY = "tcall:onboarding-v2";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function completeOnboarding() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
}
