"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CreditCard, Phone, MessageSquare, ShieldAlert, BarChart3,
  Search, Check, X, Trash2, Lock, Ban, Crown, ChevronLeft, ChevronRight,
  RefreshCw, LogOut, ShieldCheck, Sparkles, Eye, UserPlus, AlertTriangle,
} from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";
import { formatVanityPrice, formatTierLabel } from "@/lib/vanity-pricing";
import { getUI } from "@/lib/languages";

const ui = getUI("uz");

type Tab = "dashboard" | "users" | "subscriptions" | "vanity" | "chats" | "reports" | "admins";

interface Stats {
  users: { total: number; today: number; week: number };
  subscriptions: { free: number; premium: number; premiumPlus: number; monthlyRevenue: string };
  calls: { total: number; today: number };
  messages: { total: number };
  pending: { vanity: number; reports: number };
  bans: number;
}

interface UserRow {
  id: string; name: string; email: string; tcallId: string | null;
  createdAt: string; lastSeenAt: string | null;
  subscription: { plan: string; status: string; expiresAt: string | null } | null;
  bans: { id: string; reason: string }[];
  vanityNumber: { number: string; tier: string } | null;
}

interface SubRow {
  id: string; plan: string; status: string; price: number;
  startedAt: string; expiresAt: string | null; grantedBy: string | null;
  user: { name: string; email: string; tcallId: string | null };
}

interface VanityReq {
  id: string; number: string; price: number; tier: string; status: string; createdAt: string;
  user: { name: string; email: string; tcallId: string | null };
}

interface AdminUser {
  id: string; email: string; name: string; role: string; createdAt: string; lastLoginAt: string | null;
}

interface Report {
  id: string; type: string; reason: string; targetId: string; notes: string | null;
  status: string; reportedBy: string | null; createdAt: string;
}

interface Conversation {
  id: string; type: string; name: string | null; updatedAt: string;
  members: { user: { name: string; email: string; tcallId: string | null } }[];
  messages: { originalText: string | null; createdAt: string }[];
}

function adminFetch(path: string, init?: RequestInit) {
  return fetch(path, { ...init, credentials: "include" });
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [admin, setAdmin] = useState<{ email: string; name: string; role: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userQ, setUserQ] = useState("");
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subPages, setSubPages] = useState(1);
  const [vanityReqs, setVanityReqs] = useState<VanityReq[]>([]);
  const [chats, setChats] = useState<Conversation[]>([]);
  const [chatInspect, setChatInspect] = useState<{ conv: Conversation; messages: { id: string; originalText: string | null; sender: { name: string }; createdAt: string }[] } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionUser, setActionUser] = useState<UserRow | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [actionInput, setActionInput] = useState<{ password?: string; banReason?: string; banDays?: string; plan?: string; planDays?: string }>({});
  const [newAdmin, setNewAdmin] = useState({ email: "", name: "", password: "", role: "admin" });
  const [chatQ, setChatQ] = useState("");

  // Auth check
  useEffect(() => {
    adminFetch("/api/admin/auth").then(async (r) => {
      const d = await r.json();
      if (!r.ok || !d.authenticated) { router.replace("/admin/login"); return; }
      setAdmin(d.admin);
      void loadStats();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    const r = await adminFetch("/api/admin/stats");
    const d = await r.json();
    if (r.ok) setStats(d);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch(`/api/admin/users?q=${encodeURIComponent(userQ)}&page=${userPage}`);
    const d = await r.json();
    if (r.ok) { setUsers(d.users); setUserTotal(d.total); setUserPages(d.pages); }
    setLoading(false);
  }, [userQ, userPage]);

  const loadSubs = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch(`/api/admin/subscriptions?page=${subPage}`);
    const d = await r.json();
    if (r.ok) { setSubs(d.subs); setSubTotal(d.total); setSubPages(d.pages); }
    setLoading(false);
  }, [subPage]);

  const loadVanity = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch("/api/admin/vanity-requests?status=pending");
    const d = await r.json();
    if (r.ok) setVanityReqs(d.requests || []);
    setLoading(false);
  }, []);

  const loadChats = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch(`/api/admin/chat-inspect?q=${encodeURIComponent(chatQ)}&page=1`);
    const d = await r.json();
    if (r.ok) setChats(d.conversations || []);
    setLoading(false);
  }, [chatQ]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const r = await adminFetch("/api/admin/reports?status=pending");
    const d = await r.json();
    if (r.ok) setReports(d.reports || []);
    setLoading(false);
  }, []);

  const loadAdmins = useCallback(async () => {
    const r = await adminFetch("/api/admin/admins");
    const d = await r.json();
    if (r.ok) setAdmins(d.admins || []);
  }, []);

  useEffect(() => {
    if (tab === "users") void loadUsers();
    if (tab === "subscriptions") void loadSubs();
    if (tab === "vanity") void loadVanity();
    if (tab === "chats") void loadChats();
    if (tab === "reports") void loadReports();
    if (tab === "admins") void loadAdmins();
  }, [tab, loadUsers, loadSubs, loadVanity, loadChats, loadReports, loadAdmins]);

  const doAction = async () => {
    if (!actionUser) return;
    setError("");
    const body: Record<string, unknown> = { userId: actionUser.id, action: actionType };
    if (actionType === "reset_password") body.newPassword = actionInput.password;
    if (actionType === "ban") { body.banReason = actionInput.banReason; body.banDays = actionInput.banDays ? Number(actionInput.banDays) : undefined; }
    if (actionType === "set_subscription") { body.plan = actionInput.plan; body.planDays = actionInput.planDays ? Number(actionInput.planDays) : undefined; }
    const r = await adminFetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) { setError(d.error); return; }
    setActionUser(null); setActionType(""); setActionInput({});
    void loadUsers(); void loadStats();
  };

  const reviewVanity = async (id: string, action: "approve" | "reject") => {
    const r = await adminFetch(`/api/admin/vanity-requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (r.ok) setVanityReqs((prev) => prev.filter((x) => x.id !== id));
  };

  const inspectChat = async (id: string) => {
    const r = await adminFetch(`/api/admin/chat-inspect?conversationId=${id}`);
    const d = await r.json();
    if (r.ok) setChatInspect({ conv: d.conv, messages: d.messages });
  };

  const resolveReport = async (id: string, action: "resolve" | "dismiss") => {
    const r = await adminFetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId: id, action }) });
    if (r.ok) setReports((prev) => prev.filter((x) => x.id !== id));
  };

  const createAdmin = async () => {
    const r = await adminFetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newAdmin) });
    const d = await r.json();
    if (!r.ok) { setError(d.error); return; }
    setNewAdmin({ email: "", name: "", password: "", role: "admin" });
    void loadAdmins();
  };

  const logout = async () => {
    await adminFetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "users", label: "Foydalanuvchilar", icon: <Users className="w-4 h-4" />, badge: stats?.users.total },
    { id: "subscriptions", label: "Obunalar", icon: <CreditCard className="w-4 h-4" />, badge: (stats?.subscriptions.premium ?? 0) + (stats?.subscriptions.premiumPlus ?? 0) },
    { id: "vanity", label: "Chiroyli raqamlar", icon: <Sparkles className="w-4 h-4" />, badge: stats?.pending.vanity },
    { id: "chats", label: "Suhbatlar", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "reports", label: "Shikoyatlar", icon: <AlertTriangle className="w-4 h-4" />, badge: stats?.pending.reports },
    { id: "admins", label: "Adminlar", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  const PLAN_COLORS: Record<string, string> = {
    free: "bg-slate-100 text-slate-600",
    premium: "bg-blue-100 text-blue-700",
    premium_plus: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Tcall Admin</p>
              <p className="text-slate-400 text-xs truncate">{admin?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {t.icon}
              <span className="flex-1 text-left">{t.label}</span>
              {t.badge != null && t.badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button type="button" onClick={() => void logout()} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Chiqish
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-slate-950">
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {tab === "dashboard" && stats && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Jami foydalanuvchilar", value: stats.users.total, sub: `+${stats.users.today} bugun`, icon: <Users className="w-5 h-5" />, color: "text-blue-400" },
                  { label: "Premium obunalar", value: stats.subscriptions.premium + stats.subscriptions.premiumPlus, sub: `$${stats.subscriptions.monthlyRevenue}/oy`, icon: <CreditCard className="w-5 h-5" />, color: "text-purple-400" },
                  { label: "Bugun qo'ng'iroqlar", value: stats.calls.today, sub: `Jami: ${stats.calls.total}`, icon: <Phone className="w-5 h-5" />, color: "text-green-400" },
                  { label: "Kutilayotgan", value: stats.pending.vanity + stats.pending.reports, sub: `Banlar: ${stats.bans}`, icon: <ShieldAlert className="w-5 h-5" />, color: "text-amber-400" },
                ].map((c) => (
                  <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className={`mb-3 ${c.color}`}>{c.icon}</div>
                    <p className="text-2xl font-bold text-white">{c.value}</p>
                    <p className="text-slate-400 text-xs mt-1">{c.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{c.sub}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Bepul", count: stats.subscriptions.free, color: "text-slate-400", price: "$0" },
                  { label: "Premium", count: stats.subscriptions.premium, color: "text-blue-400", price: "$4.99/oy" },
                  { label: "Premium+", count: stats.subscriptions.premiumPlus, color: "text-purple-400", price: "$9.99/oy" },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <p className={`text-sm font-semibold ${s.color} mb-2`}>{s.label} · {s.price}</p>
                    <p className="text-3xl font-bold text-white">{s.count}</p>
                    <p className="text-slate-500 text-xs mt-1">foydalanuvchi</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ USERS ═══ */}
          {tab === "users" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Foydalanuvchilar ({userTotal})</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Ism, email, ID..."
                      value={userQ}
                      onChange={(e) => { setUserQ(e.target.value); setUserPage(1); }}
                      onKeyDown={(e) => e.key === "Enter" && void loadUsers()}
                    />
                  </div>
                  <button type="button" onClick={() => void loadUsers()} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {loading ? <div className="text-center text-slate-500 py-10">Yuklanmoqda...</div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {["Ism", "Email", "ID", "Obuna", "Holat", "Amallar"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-slate-400 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/50">
                          <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                          <td className="px-4 py-3 text-slate-300">{u.email}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">{u.tcallId ? formatTcallId(u.tcallId) : "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${PLAN_COLORS[u.subscription?.plan || "free"]}`}>
                              {u.subscription?.plan || "free"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {u.bans.length > 0 ? (
                              <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700">Banned</span>
                            ) : (
                              <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">Faol</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button type="button" title="Parol yangilash" onClick={() => { setActionUser(u); setActionType("reset_password"); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-yellow-400"><Lock className="w-3.5 h-3.5" /></button>
                              <button type="button" title="Obuna" onClick={() => { setActionUser(u); setActionType("set_subscription"); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-purple-400"><Crown className="w-3.5 h-3.5" /></button>
                              {u.bans.length > 0 ? (
                                <button type="button" title="Banni olib tashlash" onClick={() => { setActionUser(u); setActionType("unban"); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-green-400"><ShieldCheck className="w-3.5 h-3.5" /></button>
                              ) : (
                                <button type="button" title="Ban" onClick={() => { setActionUser(u); setActionType("ban"); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400"><Ban className="w-3.5 h-3.5" /></button>
                              )}
                              <button type="button" title="O'chirish" onClick={() => { setActionUser(u); setActionType("delete"); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {userPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                      <button type="button" disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-slate-400 text-sm">{userPage} / {userPages}</span>
                      <button type="button" disabled={userPage >= userPages} onClick={() => setUserPage(p => p + 1)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ SUBSCRIPTIONS ═══ */}
          {tab === "subscriptions" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Obunalar ({subTotal})</h2>
                <button type="button" onClick={() => void loadSubs()} className="p-2 rounded-xl bg-slate-800 text-slate-300"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {["Foydalanuvchi", "Email", "Plan", "Narx", "Tugash", "Bergan"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {subs.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-white">{s.user.name}</td>
                        <td className="px-4 py-3 text-slate-300">{s.user.email}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg text-xs font-semibold ${PLAN_COLORS[s.plan]}`}>{s.plan}</span></td>
                        <td className="px-4 py-3 text-slate-300">${s.price}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "Muddatsiz"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{s.grantedBy || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                    <button type="button" disabled={subPage <= 1} onClick={() => setSubPage(p => p - 1)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-slate-400 text-sm">{subPage} / {subPages}</span>
                    <button type="button" disabled={subPage >= subPages} onClick={() => setSubPage(p => p + 1)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ VANITY ═══ */}
          {tab === "vanity" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Chiroyli raqam so'rovlari ({vanityReqs.length})</h2>
                <button type="button" onClick={() => void loadVanity()} className="p-2 rounded-xl bg-slate-800 text-slate-300"><RefreshCw className="w-4 h-4" /></button>
              </div>
              {vanityReqs.length === 0 ? (
                <div className="text-center text-slate-500 py-16">Kutilayotgan so'rov yo'q</div>
              ) : (
                <div className="space-y-3">
                  {vanityReqs.map((r) => (
                    <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xl font-bold text-brand-400">{formatTcallId(r.number)}</p>
                          <p className="text-slate-400 text-sm mt-1">{formatTierLabel(r.tier, ui)} · {formatVanityPrice(r.price)}</p>
                          <p className="text-slate-500 text-sm mt-2">👤 {r.user.name} · {r.user.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void reviewVanity(r.id, "approve")} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                            <Check className="w-4 h-4" /> Tasdiqlash
                          </button>
                          <button type="button" onClick={() => void reviewVanity(r.id, "reject")} className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                            <X className="w-4 h-4" /> Rad etish
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ CHATS ═══ */}
          {tab === "chats" && !chatInspect && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-white flex-1">Suhbatlar</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2 text-sm w-64 focus:outline-none" placeholder="Qidirish..." value={chatQ} onChange={(e) => setChatQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void loadChats()} />
                </div>
                <button type="button" onClick={() => void loadChats()} className="p-2 rounded-xl bg-slate-800 text-slate-300"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {["Suhbat", "Ishtirokchilar", "So'nggi xabar", "Amal"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {chats.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-white">{c.name || (c.type === "direct" ? "To'g'ridan" : "Guruh")}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{c.members.slice(0, 3).map(m => m.user.name).join(", ")}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">{c.messages[0]?.originalText || "—"}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => void inspectChat(c.id)} className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm">
                            <Eye className="w-3.5 h-3.5" /> Ko'rish
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "chats" && chatInspect && (
            <div>
              <button type="button" onClick={() => setChatInspect(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm">
                <ChevronLeft className="w-4 h-4" /> Suhbatlar ro'yxatiga qaytish
              </button>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
                <p className="text-white font-semibold">{chatInspect.conv?.name || "To'g'ridan suhbat"}</p>
                <p className="text-slate-400 text-sm mt-1">Ishtirokchilar: {chatInspect.conv?.members.map(m => m.user.name).join(", ")}</p>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {chatInspect.messages.map((m) => (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-brand-400 text-sm font-medium">{m.sender.name}</span>
                      <span className="text-slate-500 text-xs">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300 text-sm">{m.originalText || "[media]"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ REPORTS ═══ */}
          {tab === "reports" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Shikoyatlar ({reports.length})</h2>
                <button type="button" onClick={() => void loadReports()} className="p-2 rounded-xl bg-slate-800 text-slate-300"><RefreshCw className="w-4 h-4" /></button>
              </div>
              {reports.length === 0 ? (
                <div className="text-center text-slate-500 py-16">Kutilayotgan shikoyat yo'q</div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-lg text-xs bg-red-100 text-red-700 font-semibold">{r.reason}</span>
                            <span className="text-slate-500 text-xs">{r.type}</span>
                          </div>
                          <p className="text-slate-300 text-sm">Target: <span className="font-mono text-xs">{r.targetId}</span></p>
                          {r.notes && <p className="text-slate-400 text-sm mt-1">{r.notes}</p>}
                          <p className="text-slate-500 text-xs mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void resolveReport(r.id, "resolve")} className="flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-1.5 rounded-xl text-xs font-medium">
                            <Check className="w-3.5 h-3.5" /> Hal qilindi
                          </button>
                          <button type="button" onClick={() => void resolveReport(r.id, "dismiss")} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-medium">
                            <X className="w-3.5 h-3.5" /> E'tiborsiz
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ ADMINS ═══ */}
          {tab === "admins" && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Adminlar</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {["Ism", "Email", "Rol", "Oxirgi kirish", "Amal"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {admins.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-white">{a.name}</td>
                        <td className="px-4 py-3 text-slate-300">{a.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${a.role === "super_admin" ? "bg-amber-100 text-amber-700" : "bg-slate-700 text-slate-300"}`}>
                            {a.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Hech qachon"}</td>
                        <td className="px-4 py-3">
                          {a.email !== "admin@tcall.uz" && admin?.role === "super_admin" && (
                            <button type="button" onClick={async () => { await adminFetch(`/api/admin/admins?id=${a.id}`, { method: "DELETE" }); void loadAdmins(); }} className="text-red-400 hover:text-red-300 text-xs">O'chirish</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {admin?.role === "super_admin" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Yangi admin qo'shish</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {[
                      { label: "Ism", key: "name", type: "text", placeholder: "Admin nomi" },
                      { label: "Email", key: "email", type: "email", placeholder: "admin@tcall.uz" },
                      { label: "Parol", key: "password", type: "password", placeholder: "Kamida 8 belgi" },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="text-slate-400 text-xs mb-1 block">{f.label}</label>
                        <input
                          type={f.type}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          placeholder={f.placeholder}
                          value={(newAdmin as Record<string, string>)[f.key]}
                          onChange={(e) => setNewAdmin(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Rol</label>
                      <select className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none" value={newAdmin.role} onChange={(e) => setNewAdmin(prev => ({ ...prev, role: e.target.value }))}>
                        <option value="admin">admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    </div>
                  </div>
                  <button type="button" onClick={() => void createAdmin()} className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors">
                    Qo'shish
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Action Modal */}
      {actionUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setActionUser(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold mb-1">
              {actionType === "reset_password" ? "Parolni yangilash" :
               actionType === "ban" ? "Ban berish" :
               actionType === "unban" ? "Banni olib tashlash" :
               actionType === "set_subscription" ? "Obuna o'rnatish" :
               "Foydalanuvchini o'chirish"}
            </h3>
            <p className="text-slate-400 text-sm mb-4">{actionUser.name} · {actionUser.email}</p>

            {actionType === "reset_password" && (
              <input type="password" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none" placeholder="Yangi parol (min 6 belgi)" value={actionInput.password || ""} onChange={(e) => setActionInput(p => ({ ...p, password: e.target.value }))} />
            )}
            {actionType === "ban" && (
              <div className="space-y-3 mb-4">
                <input className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Ban sababi" value={actionInput.banReason || ""} onChange={(e) => setActionInput(p => ({ ...p, banReason: e.target.value }))} />
                <input type="number" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Kun (bo'sh = muddatsiz)" value={actionInput.banDays || ""} onChange={(e) => setActionInput(p => ({ ...p, banDays: e.target.value }))} />
              </div>
            )}
            {actionType === "set_subscription" && (
              <div className="space-y-3 mb-4">
                <select className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none" value={actionInput.plan || "free"} onChange={(e) => setActionInput(p => ({ ...p, plan: e.target.value }))}>
                  <option value="free">Bepul (free)</option>
                  <option value="premium">Premium ($4.99/oy)</option>
                  <option value="premium_plus">Premium+ ($9.99/oy)</option>
                </select>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none" placeholder="Kun (bo'sh = muddatsiz)" value={actionInput.planDays || ""} onChange={(e) => setActionInput(p => ({ ...p, planDays: e.target.value }))} />
              </div>
            )}
            {actionType === "delete" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
                Diqqat! Bu amalni qaytarib bo'lmaydi. Foydalanuvchi va uning barcha ma'lumotlari o'chiriladi.
              </div>
            )}
            {actionType === "unban" && (
              <p className="text-slate-400 text-sm mb-4">Bu foydalanuvchidan barcha ban olib tashlanadi.</p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setActionUser(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors">Bekor</button>
              <button type="button" onClick={() => void doAction()} className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${actionType === "delete" || actionType === "ban" ? "bg-red-600 hover:bg-red-500" : "bg-brand-600 hover:bg-brand-500"}`}>
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
