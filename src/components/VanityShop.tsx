"use client";

import { useState } from "react";
import { Sparkles, Check, Crown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getUI } from "@/lib/languages";

interface VanityNumber {
  id: string;
  number: string;
  price: number;
  tier: string;
}

interface VanityShopProps {
  userLanguage: string;
  currentId: string;
  onPurchased: (newId: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  platinum: "from-purple-500/30 to-pink-500/20 border-purple-400/40",
  gold: "from-yellow-500/20 to-orange-500/10 border-yellow-400/30",
  silver: "from-slate-400/20 to-slate-500/10 border-slate-400/30",
};

export function VanityShop({ userLanguage, currentId, onPurchased }: VanityShopProps) {
  const ui = getUI(userLanguage);
  const [numbers, setNumbers] = useState<VanityNumber[]>([]);
  const [owned, setOwned] = useState<{ number: string; tier: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/numbers");
      const data = await res.json();
      setNumbers(data.numbers || []);
      setOwned(data.owned || null);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const purchase = async (numberId: string) => {
    setBuying(numberId);
    setError("");
    try {
      const res = await apiFetch("/api/numbers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onPurchased(data.tcallId);
      setOwned({ number: data.tcallId, tier: data.tier });
      setNumbers((prev) => prev.filter((n) => n.id !== numberId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setBuying(null);
    }
  };

  const formatPrice = (p: number) => `${(p / 1000).toFixed(0)}k so'm`;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{ui.vanityNumbers}</h2>
          <p className="text-white/50 text-xs">{ui.vanityDesc}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="bg-brand-600/10 border border-brand-500/20 rounded-xl p-4 mb-4">
        <p className="text-white/50 text-xs mb-1">{ui.yourNumber}</p>
        <p className="text-2xl font-mono font-bold text-brand-300">{formatTcallId(currentId)}</p>
        {owned && (
          <p className="text-purple-300 text-xs mt-1 flex items-center gap-1">
            <Crown className="w-3 h-3" /> {ui.premiumNumber}
          </p>
        )}
      </div>

      {!loaded ? (
        <button onClick={load} disabled={loading} className="btn-secondary w-full">
          {loading ? "..." : ui.browseNumbers}
        </button>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {numbers.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-4">{ui.noNumbersAvailable}</p>
          ) : (
            numbers.map((n) => (
              <div
                key={n.id}
                className={`flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r ${TIER_COLORS[n.tier] || TIER_COLORS.silver}`}
              >
                <div>
                  <p className="font-mono font-bold text-lg">{formatTcallId(n.number)}</p>
                  <p className="text-xs text-white/50 capitalize">{n.tier} · {formatPrice(n.price)}</p>
                </div>
                <button
                  onClick={() => purchase(n.id)}
                  disabled={!!buying || !!owned}
                  className="btn-primary text-sm py-2 px-4 min-h-0"
                >
                  {buying === n.id ? "..." : owned ? <Check className="w-4 h-4" /> : ui.buy}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
