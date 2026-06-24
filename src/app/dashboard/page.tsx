"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Check, Bell, BellOff, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCallContext } from "@/components/providers/CallProvider";
import { getLanguage, getUI } from "@/lib/languages";
import { formatTcallId } from "@/lib/tcallId";
import { copyToClipboard } from "@/lib/utils";
import { Dialer } from "@/components/Dialer";
import { RecentsList } from "@/components/RecentsList";
import { ContactsManager } from "@/components/ContactsManager";
import { RoomPanel } from "@/components/RoomPanel";
import { VanityShop } from "@/components/VanityShop";
import { SpeedDial } from "@/components/SpeedDial";
import { SettingsPanel } from "@/components/SettingsPanel";
import { MessagesInbox } from "@/components/MessagesInbox";
import { QuickMessageModal } from "@/components/QuickMessageModal";
import { PhoneShell, PhoneHeader, type PhoneTab } from "@/components/PhoneShell";
import { TcallLogo } from "@/components/TcallLogo";

interface CallRecord {
  id: string;
  roomId: string;
  status: string;
  durationSec?: number | null;
  calleeTcallId?: string | null;
  createdAt: string;
  host: { name: string; language: string; tcallId: string };
  participants: { user: { name: string; language: string; tcallId: string } }[];
}

export default function DashboardPage() {
  const { user, loading, logout, setUser } = useAuth();
  const router = useRouter();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<PhoneTab>("keypad");
  const [loadError, setLoadError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [favorites, setFavorites] = useState<{ name: string; tcallId: string }[]>([]);
  const [missedCount, setMissedCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading && !user) return null;
  if (!user) return null;

  return (
    <DashboardInner
      user={user}
      logout={logout}
      setUser={setUser}
      calls={calls}
      setCalls={setCalls}
      copied={copied}
      setCopied={setCopied}
      tab={tab}
      setTab={setTab}
      loadError={loadError}
      setLoadError={setLoadError}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      favorites={favorites}
      setFavorites={setFavorites}
      missedCount={missedCount}
      setMissedCount={setMissedCount}
      messageCount={messageCount}
      setMessageCount={setMessageCount}
    />
  );
}

function DashboardInner({
  user,
  logout,
  setUser,
  calls,
  setCalls,
  copied,
  setCopied,
  tab,
  setTab,
  loadError,
  setLoadError,
  showSettings,
  setShowSettings,
  favorites,
  setFavorites,
  missedCount,
  setMissedCount,
  messageCount,
  setMessageCount,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  logout: () => void;
  setUser: ReturnType<typeof useAuth>["setUser"];
  calls: CallRecord[];
  setCalls: (c: CallRecord[]) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
  tab: PhoneTab;
  setTab: (t: PhoneTab) => void;
  loadError: string;
  setLoadError: (v: string) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  favorites: { name: string; tcallId: string }[];
  setFavorites: (f: { name: string; tcallId: string }[]) => void;
  missedCount: number;
  setMissedCount: (n: number) => void;
  messageCount: number;
  setMessageCount: (n: number) => void;
}) {
  const { enableNotifications, notificationsEnabled, quickMessageTarget, clearQuickMessageTarget, socketConnected } = useCallContext();
  const ui = getUI(user.language);
  const [mountedTabs, setMountedTabs] = useState<Set<PhoneTab>>(new Set(["keypad"]));

  useEffect(() => {
    setMountedTabs((prev) => new Set(prev).add(tab));
  }, [tab]);

  const refresh = useCallback(() => {
    apiFetch("/api/calls")
      .then((r) => r.json())
      .then((d) => {
        if (d.calls) {
          setCalls(d.calls);
          const missedIncoming = d.calls.filter(
            (c: CallRecord) =>
              (c.status === "missed" || c.status === "rejected") &&
              c.calleeTcallId === user.tcallId
          ).length;
          setMissedCount(missedIncoming);
        }
        setLoadError("");
      })
      .catch(() => setLoadError(ui.loadError));

    apiFetch("/api/contacts")
      .then((r) => r.json())
      .then((d) => {
        const favs = (d.contacts || []).filter((c: { favorite: boolean }) => c.favorite);
        setFavorites(favs.map((c: { name: string; tcallId: string }) => ({ name: c.name, tcallId: c.tcallId })));
      });

    apiFetch("/api/messages")
      .then((r) => r.json())
      .then((d) => setMessageCount(d.unreadCount || 0));
  }, [setCalls, setLoadError, setFavorites, setMissedCount, setMessageCount, ui.loadError, user.tcallId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!loadError) return;
    const retry = setTimeout(() => refresh(), 4000);
    return () => clearTimeout(retry);
  }, [loadError, refresh]);

  useEffect(() => {
    if (tab === "recents") setMissedCount(0);
  }, [tab, setMissedCount]);

  useEffect(() => {
    const onQuickMessage = () => refresh();
    window.addEventListener("tcall:quick-message", onQuickMessage);
    return () => window.removeEventListener("tcall:quick-message", onQuickMessage);
  }, [refresh]);

  const copyId = async () => {
    if (!user.tcallId) return;
    const ok = await copyToClipboard(user.tcallId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabTitles: Record<PhoneTab, string> = {
    keypad: "Tcall",
    recents: ui.recents,
    contacts: ui.contacts,
    room: "Tcall",
    numbers: ui.vanityNumbers,
    messages: ui.messages,
  };
  const showLogo = tab === "keypad" || tab === "room";

  const userLang = getLanguage(user.language);

  return (
    <>
      <PhoneShell
        userLanguage={user.language}
        activeTab={tab}
        onTabChange={setTab}
        badges={{ recents: missedCount, messages: messageCount }}
        header={
          <PhoneHeader
            title={tabTitles[tab]}
            showLogo={showLogo}
            subtitle={tab === "keypad" ? `${userLang.flag} ${user.name}` : undefined}
            right={
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSettings(true)} className="ios-icon-btn" title={ui.settings}>
                  <Settings className="w-5 h-5" />
                </button>
                <button onClick={() => enableNotifications()} className="ios-icon-btn" title={ui.enableNotifications}>
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-green-600" />
                  ) : (
                    <BellOff className="w-5 h-5 text-yellow-400" />
                  )}
                </button>
                <button onClick={logout} className="ios-icon-btn">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            }
          />
        }
      >
        {!socketConnected && (
          <div className="ios-reconnect-banner">
            <TcallLogo size="xs" animate />
            <span>{ui.reconnecting}</span>
          </div>
        )}

        {mountedTabs.has("keypad") && (
          <div className={tab === "keypad" ? "app-tab-panel" : "hidden"}>
            <button onClick={copyId} className="ios-my-number">
              <span className="text-xs text-slate-500">{ui.yourNumber}</span>
              <span className="font-mono text-lg font-semibold text-brand-600 tracking-wider flex items-center gap-2">
                {user.tcallId ? formatTcallId(user.tcallId) : "..."}
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </span>
            </button>
            <SpeedDial userLanguage={user.language} favorites={favorites} />
            <Dialer userLanguage={user.language} />
          </div>
        )}

        {mountedTabs.has("recents") && (
          <div className={tab === "recents" ? "app-tab-panel" : "hidden"}>
            <RecentsList userLanguage={user.language} userTcallId={user.tcallId} calls={calls} />
          </div>
        )}

        {mountedTabs.has("messages") && (
          <div className={tab === "messages" ? "app-tab-panel" : "hidden"}>
            <MessagesInbox userLanguage={user.language} onRead={() => setMessageCount(0)} />
          </div>
        )}

        {mountedTabs.has("contacts") && (
          <div className={tab === "contacts" ? "app-tab-panel" : "hidden"}>
            <ContactsManager userLanguage={user.language} />
          </div>
        )}

        {mountedTabs.has("room") && (
          <div className={tab === "room" ? "app-tab-panel" : "hidden"}>
            <RoomPanel userLanguage={user.language} />
          </div>
        )}

        {mountedTabs.has("numbers") && (
          <div className={tab === "numbers" ? "app-tab-panel" : "hidden"}>
            <VanityShop
              userLanguage={user.language}
              currentId={user.tcallId}
              onPurchased={(newId) => setUser({ ...user, tcallId: newId })}
            />
          </div>
        )}
      </PhoneShell>

      {showSettings && (
        <SettingsPanel
          user={user}
          userLanguage={user.language}
          onClose={() => setShowSettings(false)}
          onUpdate={(updates) => setUser({ ...user, ...updates })}
        />
      )}

      {quickMessageTarget && (
        <QuickMessageModal
          recipientTcallId={quickMessageTarget.tcallId}
          recipientName={quickMessageTarget.name}
          userLanguage={user.language}
          onClose={clearQuickMessageTarget}
          onSent={refresh}
        />
      )}
    </>
  );
}
