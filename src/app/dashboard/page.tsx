"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, Check, Bell, BellOff, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCallContext } from "@/components/providers/CallProvider";
import { getLanguage } from "@/lib/languages";
import { useUI } from "@/components/providers/LocaleProvider";
import { formatTcallId } from "@/lib/tcallId";
import { copyToClipboard } from "@/lib/utils";
import { Dialer } from "@/components/Dialer";
import { RecentsList } from "@/components/RecentsList";
import { FriendsPanel } from "@/components/FriendsPanel";
import { RoomPanel } from "@/components/RoomPanel";
import { VanityShop } from "@/components/VanityShop";
import { SpeedDial } from "@/components/SpeedDial";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChatMessenger } from "@/components/ChatMessenger";
import { QuickMessageModal } from "@/components/QuickMessageModal";
import { LiveInterpreter } from "@/components/LiveInterpreter";
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
  const [friends, setFriends] = useState<{ name: string; tcallId: string }[]>([]);
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
      friends={friends}
      setFriends={setFriends}
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
  friends,
  setFriends,
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
  friends: { name: string; tcallId: string }[];
  setFriends: (f: { name: string; tcallId: string }[]) => void;
  missedCount: number;
  setMissedCount: (n: number) => void;
  messageCount: number;
  setMessageCount: (n: number) => void;
}) {
  const { enableNotifications, notificationsEnabled, quickMessageTarget, clearQuickMessageTarget, socketConnected } = useCallContext();
  const ui = useUI(user.language);
  const [mountedTabs, setMountedTabs] = useState<Set<PhoneTab>>(new Set(["keypad"]));
  const [chatOpenTcallId, setChatOpenTcallId] = useState<string | null>(null);
  const [chatInThread, setChatInThread] = useState(false);

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
        const list = (d.contacts || []).map((c: { name: string; tcallId: string }) => ({
          name: c.name,
          tcallId: c.tcallId,
        }));
        setFriends(list);
      });

    apiFetch("/api/chat/conversations")
      .then((r) => r.json())
      .then((d) => setMessageCount(d.unreadCount || 0));
  }, [setCalls, setLoadError, setFriends, setMissedCount, setMessageCount, ui.loadError, user.tcallId]);

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

  useEffect(() => {
    const onOpenChat = (e: Event) => {
      const tcallId = (e as CustomEvent).detail?.tcallId as string | undefined;
      if (tcallId) {
        setTab("messages");
        setChatOpenTcallId(tcallId);
      }
    };
    window.addEventListener("tcall:open-chat", onOpenChat);
    return () => window.removeEventListener("tcall:open-chat", onOpenChat);
  }, [setTab]);

  const copyId = async () => {
    if (!user.tcallId) return;
    const ok = await copyToClipboard(user.tcallId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (tab !== "messages") setChatInThread(false);
  }, [tab]);

  const tabTitles: Record<PhoneTab, string> = {
    keypad: ui.keypad,
    recents: ui.recents,
    friends: ui.friendsTab,
    room: ui.roomTab,
    numbers: ui.vanityNumbers,
    messages: ui.messages,
    interpreter: ui.interpreterTab,
  };
  const showLogo = tab === "keypad" || tab === "room";
  const useContextHeader = showLogo || tab === "messages";

  const userLang = getLanguage(user.language);

  return (
    <>
      <PhoneShell
        userLanguage={user.language}
        activeTab={tab}
        onTabChange={setTab}
        badges={{ recents: missedCount, messages: messageCount }}
        hideHeader={tab === "messages" && chatInThread}
        contentClassName={tab === "messages" ? "ios-phone-content-chat" : undefined}
        header={
          <PhoneHeader
            title={tabTitles[tab]}
            showLogo={showLogo}
            context={
              useContextHeader
                ? {
                    tab,
                    tabLabel: tabTitles[tab],
                    userFlag: tab === "keypad" ? userLang.flag : undefined,
                    userName: tab === "keypad" ? user.name : undefined,
                  }
                : undefined
            }
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
          <div className="ios-reconnect-banner shrink-0">
            <TcallLogo size="xs" animate />
            <span>{ui.reconnecting}</span>
          </div>
        )}

        {mountedTabs.has("keypad") && (
          <div className={tab === "keypad" ? "app-tab-panel app-tab-keypad" : "hidden"}>
            <button onClick={copyId} className="ios-my-number shrink-0">
              <span className="text-xs text-slate-500">{ui.yourNumber}</span>
              <span className="font-mono text-lg font-semibold text-brand-600 tracking-wider flex items-center gap-2">
                {user.tcallId ? formatTcallId(user.tcallId) : "..."}
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </span>
            </button>
            <SpeedDial userLanguage={user.language} favorites={friends} />
            <Dialer userLanguage={user.language} />
          </div>
        )}

        {mountedTabs.has("recents") && (
          <div className={tab === "recents" ? "app-tab-panel" : "hidden"}>
            <div className="app-tab-scroll">
              <RecentsList
                userLanguage={user.language}
                userTcallId={user.tcallId}
                calls={calls}
                onOpenChat={(tcallId) => {
                  setTab("messages");
                  setChatOpenTcallId(tcallId);
                }}
              />
            </div>
          </div>
        )}

        {mountedTabs.has("messages") && (
          <div className={tab === "messages" ? "app-tab-panel chat-tab-panel" : "hidden"}>
            <ChatMessenger
              userLanguage={user.language}
              userId={user.userId}
              onThreadChange={setChatInThread}
              openTcallId={chatOpenTcallId}
              onOpenHandled={() => setChatOpenTcallId(null)}
              onUnreadChange={() => {
                apiFetch("/api/chat/conversations")
                  .then((r) => r.json())
                  .then((d) => setMessageCount(d.unreadCount || 0));
              }}
            />
          </div>
        )}

        {mountedTabs.has("friends") && (
          <div className={tab === "friends" ? "app-tab-panel" : "hidden"}>
            <div className="app-tab-scroll">
              <FriendsPanel
                userLanguage={user.language}
                onOpenChat={(tcallId) => {
                  setTab("messages");
                  setChatOpenTcallId(tcallId);
                }}
              />
            </div>
          </div>
        )}

        {mountedTabs.has("room") && (
          <div className={tab === "room" ? "app-tab-panel" : "hidden"}>
            <div className="app-tab-scroll">
              <RoomPanel userLanguage={user.language} />
            </div>
          </div>
        )}

        {mountedTabs.has("interpreter") && (
          <div className={tab === "interpreter" ? "app-tab-panel" : "hidden"}>
            <div className="app-tab-scroll">
              <LiveInterpreter userLanguage={user.language} />
            </div>
          </div>
        )}

        {mountedTabs.has("numbers") && (
          <div className={tab === "numbers" ? "app-tab-panel" : "hidden"}>
            <div className="app-tab-scroll">
              <VanityShop userLanguage={user.language} currentId={user.tcallId} />
            </div>
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
          onSent={() => {
            refresh();
            setTab("messages");
            setChatOpenTcallId(quickMessageTarget.tcallId);
            clearQuickMessageTarget();
          }}
        />
      )}
    </>
  );
}
