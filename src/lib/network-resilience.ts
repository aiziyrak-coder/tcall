const API_TIMEOUT_MS = 45_000;
const API_RETRY_DELAYS = [800, 2000, 4000];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = err.name;
  const msg = err.message.toLowerCase();
  return (
    name === "AbortError" ||
    name === "TypeError" ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed")
  );
}

function isRetryableStatus(status: number, method: string): boolean {
  if (status === 408 || status === 429) return true;
  if (status >= 502 && status <= 504) return method === "GET" || method === "HEAD";
  return false;
}

/** fetch with timeout — zaif internetda osilib qolmasin */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const external = init?.signal;
  if (external) {
    external.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** GET/HEAD va tarmoq xatolarida qayta urinish */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(input, init);
      if (attempt < maxAttempts - 1 && isRetryableStatus(res.status, method)) {
        await sleep(API_RETRY_DELAYS[attempt] ?? 4000);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1 && isRetryableNetworkError(err)) {
        await sleep(API_RETRY_DELAYS[attempt] ?? 4000);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Network error");
}
