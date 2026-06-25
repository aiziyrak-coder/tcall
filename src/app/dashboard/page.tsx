"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff, LogOut, MoreVertical, Settings, Headset } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCallContext } from "@/components/providers/CallProvider";
import { getLanguage } from "@/lib/languages";
import { useUI } from "@/components/providers/LocaleProvider";
import { formatTcallId } from "@/lib/tcallId";
import { Dialer } from "@/components/Dialer";
import { ReconnectPill, HintPill } from "@/components/AppToast";
import { RecentsList } from "@/components/RecentsList";
import { FriendsPanel } from "@/components/FriendsPanel";
import { RoomPanel } from "@/components/RoomPanel";
import { VanityShop } from "@/components/VanityShop";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ChatMessenger } from "@/components/ChatMessenger";
import { SupportChat } from "@/components/SupportChat";
import { QuickMessageModal } from "@/components/QuickMessageModal";
import { LiveInterpreter } from "@/components/LiveInterpreter";
import { PhoneShell, PhoneHeader, type PhoneTab } from "@/components/PhoneShell";
import { isNativeApp } from "@/lib/native-app";

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
  const [tab, setTab] = useState<PhoneTab>("keypad");
  const [loadError, setLoadError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
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
      tab={tab}
      setTab={setTab}
      loadError={loadError}
      setLoadError={setLoadError}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
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
  tab,
  setTab,
  loadError,
  setLoadError,
  showSettings,
  setShowSettings,
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
  tab: PhoneTab;
  setTab: (t: PhoneTab) => void;
  loadError: string;
  setLoadError: (v: string) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
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
  const [notifHint, setNotifHint] = useState("");
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);

  useEffect(() => {
    setMountedTabs((prev) => new Set(prev).add(tab));
  }, [tab]);

  const refresh = useCallback(() => {
    apiFetch("/api/calls")
      .then((r) => r.json())
      .then((d) => {
        if (d.calls) {
          setCalls(d.calls);
          // "missed" = ring timed out (user was callee, didn't answer)
          // "rejected" means user rejected = not missed, intentional
          const missedIncoming = d.calls.filter(
            (c: CallRecord) =>
              c.status === "missed" &&
              c.calleeTcallId === user.tcallId
          ).length;
          setMissedCount(missedIncoming);
        }
        setLoadError("");
      })
      .catch(() => setLoadError(ui.loadError));

    apiFetch("/api/chat/conversations")
      .then((r) => r.json())
      .then((d) => setMessageCount(d.unreadCount || 0));
  }, [setCalls, setLoadError, setMissedCount, setMessageCount, ui.loadError, user.tcallId]);

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

  const refreshSupportUnread = useCallback(() => {
    apiFetch("/api/support?unread=1")
      .then((r) => r.json())
      .then((d) => setSupportUnread(d.unread || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onOpenSupport = () => { setShowSupport(true); setSupportUnread(0); };
    window.addEventListener("tcall:open-support", onOpenSupport);
    return () => window.removeEventListener("tcall:open-support", onOpenSupport);
  }, []);

  useEffect(() => {
    refreshSupportUnread();
    const t = setInterval(refreshSupportUnread, 20_000);
    return () => clearInterval(t);
  }, [refreshSupportUnread]);

  useEffect(() => {
    const onSupportMessage = () => refreshSupportUnread();
    window.addEventListener("tcall:support-message", onSupportMessage);
    return () => window.removeEventListener("tcall:support-message", onSupportMessage);
  }, [refreshSupportUnread]);

  const handleNotifications = async () => {
    setNotifHint("");
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") {
        setNotifHint(ui.notificationsEnabled);
        return;
      }
      if (Notification.permission === "denied") {
        setNotifHint(ui.notificationsBlocked);
        return;
      }
    }
    const ok = await enableNotifications();
    setNotifHint(ok ? ui.notificationsEnabled : ui.notificationsBlocked);
    setTimeout(() => setNotifHint(""), 3000);
  };

  useEffect(() => {
    if (tab !== "messages") setChatInThread(false);
  }, [tab]);

  useEffect(() => {
    setShowHeaderMenu(false);
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
  const nativeApp = isNativeApp();
  const userNumber = user.tcallId ? formatTcallId(user.tcallId) : "...";
  const supportLabel = user.language?.startsWith("ru")
    ? "Поддержка"
    : user.language?.startsWith("en")
      ? "Support"
      : "Qo'llab-quvvatlash";

  return (
    <>
      <PhoneShell
        userLanguage={user.language}
        activeTab={tab}
        onTabChange={setTab}
        badges={{ recents: missedCount, messages: messageCount }}
        hideHeader={tab === "messages" && chatInThread}
        hideTabBar={tab === "messages" && chatInThread}
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
                    userName: tab === "keypad" ? userNumber : undefined,
                    userCaption: tab === "keypad" ? ui.yourNumber : undefined,
                    userFlag: tab === "keypad" ? undefined : userLang.flag,
                  }
                : undefined
            }
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSupport(true); setSupportUnread(0); }}
                  className="ios-icon-btn relative"
                  title={supportLabel}
                  aria-label={supportLabel}
                >
                  <Headset className="w-5 h-5" />
                  {supportUnread > 0 && (
                    <span className="header-icon-badge">{supportUnread > 9 ? "9+" : supportUnread}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHeaderMenu(true)}
                  className="ios-icon-btn"
                  title={ui.moreTab}
                  aria-label={ui.moreTab}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            }
          />
        }
      >
        <ReconnectPill visible={!socketConnected} label={ui.reconnecting} />
        <HintPill message={notifHint || null} />

        {mountedTabs.has("keypad") && (
          <div className={tab === "keypad" ? "app-tab-panel app-tab-keypad" : "hidden"}>
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

      <SupportChat
        open={showSupport}
        userLanguage={user.language}
        onClose={() => { setShowSupport(false); refreshSupportUnread(); }}
      />

      {showHeaderMenu && (
        <div className="ios-modal-overlay" onClick={() => setShowHeaderMenu(false)}>
          <div className="ios-modal-panel header-actions-sheet" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="header-actions-item"
              onClick={() => {
                setShowHeaderMenu(false);
                void handleNotifications();
              }}
            >
              {notificationsEnabled ? (
                <Bell className="w-4 h-4 text-green-600" />
              ) : (
                <BellOff className="w-4 h-4 text-yellow-500" />
              )}
              <span>{notificationsEnabled ? ui.notificationsEnabled : ui.enableNotifications}</span>
            </button>
            <button
              type="button"
              className="header-actions-item"
              onClick={() => {
                setShowHeaderMenu(false);
                setShowSettings(true);
              }}
            >
              <Settings className="w-4 h-4" />
              <span>{ui.settings}</span>
            </button>
            {!nativeApp && (
              <button
                type="button"
                className="header-actions-item header-actions-item-danger"
                onClick={() => {
                  setShowHeaderMenu(false);
                  void logout();
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>{ui.logout}</span>
              </button>
            )}
          </div>
        </div>
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
