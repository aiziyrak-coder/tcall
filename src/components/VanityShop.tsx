"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Crown, Search, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { formatVanityPrice } from "@/lib/vanity-pricing";
import { getUI } from "@/lib/languages";
import { TcallLogo } from "@/components/TcallLogo";
import { VanityContactModal } from "@/components/VanityContactModal";

interface VanityNumber {
  id: string;
  number: string;
  price: number;
  tier: string;
}

interface PendingRequest {
  id: string;
  number: string;
  price: number;
  tier: string;
  status: string;
}

interface VanityShopProps {
  userLanguage: string;
  currentId: string;
}

const TIER_COLORS: Record<string, string> = {
  platinum: "from-purple-500/30 to-pink-500/20 border-purple-400/40",
  gold: "from-yellow-500/20 to-orange-500/10 border-yellow-400/30",
  silver: "from-slate-400/20 to-slate-500/10 border-slate-400/30",
  standard: "from-blue-400/15 to-slate-400/10 border-blue-300/30",
};

const TIERS = ["all", "platinum", "gold", "silver"] as const;

export function VanityShop({ userLanguage, currentId }: VanityShopProps) {
  const ui = getUI(userLanguage);
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [numbers, setNumbers] = useState<VanityNumber[]>([]);
  const [owned, setOwned] = useState<{ number: string; tier: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [contactModal, setContactModal] = useState<{ number: string; price: number; tier: string } | null>(null);

  const [customDigits, setCustomDigits] = useState("");
  const [customCheck, setCustomCheck] = useState<{
    available: boolean;
    price: number;
    tier: string;
    priceLabel: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [customCheckError, setCustomCheckError] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = search.replace(/\D/g, "");
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        tier,
        ...(q.length >= 2 ? { q } : {}),
      });
      const res = await apiFetch(`/api/numbers?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNumbers(data.numbers || []);
      setOwned(data.owned || null);
      setPendingRequest(data.pendingRequest || null);
      setPages(data.pages || 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [page, tier, search]);

  useEffect(() => {
    if (mode === "catalog") void loadCatalog();
  }, [mode, loadCatalog]);

  useEffect(() => {
    if (mode !== "custom") return;
    const digits = customDigits.replace(/\D/g, "");
    if (digits.length !== 9) {
      setCustomCheck(null);
      setCustomCheckError("");
      return;
    }
    if (digits[0] === "0") {
      setCustomCheck(null);
      setCustomCheckError(ui.vanityInvalidFirstDigit);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      setCustomCheckError("");
      try {
        const res = await apiFetch("/api/numbers/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number: digits }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCustomCheck({
          available: data.available,
          price: data.price,
          tier: data.tier,
          priceLabel: data.priceLabel,
        });
      } catch (e) {
        setCustomCheck(null);
        setCustomCheckError(e instanceof Error ? e.message : ui.chatActionFailed);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [customDigits, mode, ui.vanityInvalidFirstDigit, ui.chatActionFailed]);

  const submitRequest = async (opts: { numberId?: string; number?: string }) => {
    const key = opts.numberId || opts.number || "custom";
    setRequesting(key);
    setError("");
    try {
      const res = await apiFetch("/api/numbers/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPendingRequest(data.request);
      setContactModal({
        number: data.request.number,
        price: data.request.price,
        tier: data.request.tier,
      });
      void loadCatalog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setRequesting(null);
    }
  };

  const appendDigit = (d: string) => {
    const clean = customDigits.replace(/\D/g, "");
    if (clean.length >= 9) return;
    if (clean.length === 0 && d === "0") return;
    setCustomDigits(formatPartialTcallId(clean + d));
    setCustomCheckError("");
  };

  const backspace = () => {
    const clean = customDigits.replace(/\D/g, "").slice(0, -1);
    setCustomDigits(formatPartialTcallId(clean));
  };

  const blocked = !!owned || !!pendingRequest;

  return (
    <div className="vanity-shop">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{ui.vanityNumbers}</h2>
          <p className="text-slate-500 text-xs">{ui.vanityDesc}</p>
        </div>
      </div>

      <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl p-4 mb-4">
        <p className="text-slate-500 text-xs mb-1">{ui.yourNumber}</p>
        <p className="text-2xl font-mono font-bold text-brand-600">{formatTcallId(currentId)}</p>
        {owned && (
          <p className="text-purple-600 text-xs mt-1 flex items-center gap-1">
            <Crown className="w-3 h-3" /> {ui.premiumNumber}
          </p>
        )}
        {pendingRequest && !owned && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <p className="font-medium">{ui.vanityPendingTitle}</p>
            <p className="font-mono mt-1">{formatTcallId(pendingRequest.number)}</p>
            <p className="text-xs mt-1">{ui.vanityPendingNote}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="vanity-mode-tabs">
        <button
          type="button"
          className={mode === "catalog" ? "vanity-mode-active" : ""}
          onClick={() => setMode("catalog")}
        >
          {ui.vanityCatalog}
        </button>
        <button
          type="button"
          className={mode === "custom" ? "vanity-mode-active" : ""}
          onClick={() => setMode("custom")}
        >
          {ui.vanityCustomDial}
        </button>
      </div>

      {mode === "catalog" ? (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTier(t); setPage(1); }}
                className={`vanity-tier-chip ${tier === t ? "vanity-tier-chip-active" : ""}`}
              >
                {t === "all" ? ui.all : t}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-9 py-3 min-h-0"
              placeholder={ui.vanitySearchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {loading ? (
            <div className="py-10 flex justify-center"><TcallLogo size="sm" animate /></div>
          ) : numbers.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">{ui.noNumbersAvailable}</p>
          ) : (
            <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
              {numbers.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r ${TIER_COLORS[n.tier] || TIER_COLORS.silver}`}
                >
                  <div>
                    <p className="font-mono font-bold text-lg">{formatTcallId(n.number)}</p>
                    <p className="text-xs text-slate-500 capitalize">{n.tier} · {formatVanityPrice(n.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => submitRequest({ numberId: n.id })}
                    disabled={!!requesting || blocked}
                    className="btn-primary text-sm py-2 px-4 min-h-0"
                  >
                    {requesting === n.id ? "..." : ui.buy}
                  </button>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="ios-icon-btn disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-slate-500">{page} / {pages}</span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="ios-icon-btn disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="vanity-custom-dial">
          <p className="text-sm text-slate-600 mb-3">{ui.vanityCustomDesc}</p>
          <div className="vanity-custom-display font-mono text-2xl font-bold text-center py-4">
            {customDigits || "___ ___ ___"}
          </div>

          {checking && (
            <div className="flex justify-center py-2"><TcallLogo size="xs" animate /></div>
          )}

          {!checking && customCheckError && (
            <div className="vanity-custom-result vanity-custom-taken">
              <p className="font-medium">{customCheckError}</p>
            </div>
          )}

          {!checking && !customCheckError && customCheck && (
            <div className={`vanity-custom-result ${customCheck.available ? "vanity-custom-free" : "vanity-custom-taken"}`}>
              {customCheck.available ? (
                <>
                  <p className="font-medium">{ui.vanityAvailable}</p>
                  <p className="text-sm mt-1 capitalize">{customCheck.tier} · {customCheck.priceLabel}</p>
                </>
              ) : (
                <p className="font-medium">{ui.vanityTaken}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) => (
              <button
                key={key || "empty"}
                type="button"
                disabled={!key || blocked}
                onClick={() => {
                  if (key === "⌫") backspace();
                  else appendDigit(key);
                }}
                className={`vanity-dial-key ${!key ? "invisible" : ""}`}
              >
                {key}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={
              blocked ||
              !!requesting ||
              customDigits.replace(/\D/g, "").length !== 9 ||
              !customCheck?.available
            }
            onClick={() => submitRequest({ number: customDigits.replace(/\D/g, "") })}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            {requesting === customDigits.replace(/\D/g, "") ? "..." : ui.buy}
          </button>
        </div>
      )}

      {contactModal && (
        <VanityContactModal
          number={contactModal.number}
          price={contactModal.price}
          tier={contactModal.tier}
          ui={ui}
          onClose={() => setContactModal(null)}
        />
      )}
    </div>
  );
}

function formatPartialTcallId(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}
