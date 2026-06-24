"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { formatVanityPrice } from "@/lib/vanity-pricing";
import { AppSplash } from "@/components/AppSplash";
import { TcallLogo } from "@/components/TcallLogo";

interface VanityRequestRow {
  id: string;
  number: string;
  price: number;
  tier: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string; tcallId: string | null };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [requests, setRequests] = useState<VanityRequestRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const res = await apiFetch("/api/admin/vanity-requests?status=pending");
      const data = await res.json();
      if (res.status === 403) {
        setError("Admin ruxsati yo'q. ADMIN_EMAILS sozlamasini tekshiring.");
        setRequests([]);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setRequests(data.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const review = async (id: string, action: "approve" | "reject") => {
    setActing(id);
    try {
      const res = await apiFetch(`/api/admin/vanity-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setActing(null);
    }
  };

  if (loading && !user) return <AppSplash />;

  return (
    <div className="ios-phone-app">
      <div className="ios-phone-header px-4 pt-2">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="ios-icon-btn">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <TcallLogo size="xs" />
            <h1 className="text-lg font-bold">Admin panel</h1>
          </div>
          <button type="button" onClick={() => void load()} className="ios-icon-btn">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-2">Chiroyli raqam so&apos;rovlari</p>
      </div>

      <main className="ios-phone-content px-4 pb-8">
        <div className="app-tab-scroll">
          {error && (
            <div className="ios-error-banner mb-4">{error}</div>
          )}

          {fetching ? (
            <div className="py-16 flex justify-center"><TcallLogo size="md" animate /></div>
          ) : requests.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-slate-500">
              Kutilayotgan so&apos;rov yo&apos;q
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xl font-bold text-brand-600">{formatTcallId(r.number)}</p>
                    <p className="text-sm text-slate-600 capitalize mt-1">{r.tier} · {formatVanityPrice(r.price)}</p>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">pending</span>
                </div>

                <div className="mt-3 text-sm text-slate-600 space-y-1">
                  <p><strong>Foydalanuvchi:</strong> {r.user.name}</p>
                  <p><strong>Email:</strong> {r.user.email}</p>
                  <p><strong>Joriy ID:</strong> {r.user.tcallId ? formatTcallId(r.user.tcallId) : "—"}</p>
                  <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    disabled={acting === r.id}
                    onClick={() => void review(r.id, "approve")}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 min-h-0 py-3"
                  >
                    <Check className="w-4 h-4" /> Tasdiqlash
                  </button>
                  <button
                    type="button"
                    disabled={acting === r.id}
                    onClick={() => void review(r.id, "reject")}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 min-h-0 py-3 text-red-600"
                  >
                    <X className="w-4 h-4" /> Rad etish
                  </button>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
