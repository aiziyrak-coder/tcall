"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Bell, BellOff, LogOut } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth, type User } from "@/hooks/useAuth";
import { CallProvider, useCallContext } from "@/components/providers/CallProvider";
import { getLanguage, getUI } from "@/lib/languages";
import { formatTcallId } from "@/lib/tcallId";
import { copyToClipboard } from "@/lib/utils";
import { Dialer } from "@/components/Dialer";
import { RecentsList } from "@/components/RecentsList";
import { ContactsList } from "@/components/ContactsList";
import { RoomPanel } from "@/components/RoomPanel";
import { VanityShop } from "@/components/VanityShop";
import { PhoneShell, PhoneHeader, type PhoneTab } from "@/components/PhoneShell";

interface CallRecord {
  id: string;
  roomId: string;
  status: string;
  createdAt: string;
  host: { name: string; language: string; tcallId: string };
  participants: { user: { name: string; language: string; tcallId: string } }[];
}

export default function DashboardPage() {
  const { user, loading, logout, setUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="ios-phone-app flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <CallProvider
      userId={user.userId}
      userLanguage={user.language}
      translationMode={user.translationMode}
    >
      <DashboardInner user={user} logout={logout} setUser={setUser} />
    </CallProvider>
  );
}

function DashboardInner({
  user,
  logout,
  setUser,
}: {
  user: User;
  logout: () => void;
  setUser: (u: User) => void;
}) {
  const { enableNotifications, notificationsEnabled } = useCallContext();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<PhoneTab>("keypad");

  const ui = getUI(user.language);

  useEffect(() => {
    apiFetch("/api/calls")
      .then((r) => r.json())
      .then((d) => { if (d.calls) setCalls(d.calls); })
      .catch(() => {});
    void enableNotifications();
  }, [enableNotifications]);

  const contacts = useMemo(() => {
    const map = new Map<string, { name: string; tcallId: string; language: string }>();
    for (const call of calls) {
      const partner =
        call.host.tcallId !== user.tcallId
          ? call.host
          : call.participants.find((p) => p.user.tcallId !== user.tcallId)?.user;
      if (partner?.tcallId) map.set(partner.tcallId, partner);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [calls, user.tcallId]);

  const copyId = async () => {
    if (!user.tcallId) return;
    const ok = await copyToClipboard(user.tcallId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabTitles: Record<PhoneTab, string> = {
    keypad: ui.keypad,
    recents: ui.recents,
    contacts: ui.contacts,
    room: ui.roomTab,
    numbers: ui.vanityNumbers,
  };

  const userLang = getLanguage(user.language);

  return (
    <PhoneShell
      userLanguage={user.language}
      activeTab={tab}
      onTabChange={setTab}
      header={
        <PhoneHeader
          title={tabTitles[tab]}
          subtitle={tab === "keypad" ? `${userLang.flag} ${user.name}` : undefined}
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={() => enableNotifications()}
                className="ios-icon-btn"
                title={ui.enableNotifications}
              >
                {notificationsEnabled ? (
                  <Bell className="w-5 h-5 text-green-400" />
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
      {tab === "keypad" && (
        <>
          <button onClick={copyId} className="ios-my-number">
            <span className="text-xs text-white/40">{ui.yourNumber}</span>
            <span className="font-mono text-lg font-semibold text-brand-300 tracking-wider flex items-center gap-2">
              {formatTcallId(user.tcallId)}
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
            </span>
          </button>
          <Dialer userLanguage={user.language} />
        </>
      )}

      {tab === "recents" && (
        <RecentsList userLanguage={user.language} userTcallId={user.tcallId} calls={calls} />
      )}

      {tab === "contacts" && (
        <ContactsList userLanguage={user.language} contacts={contacts} />
      )}

      {tab === "room" && <RoomPanel userLanguage={user.language} />}

      {tab === "numbers" && (
        <VanityShop
          userLanguage={user.language}
          currentId={user.tcallId}
          onPurchased={(newId) => setUser({ ...user, tcallId: newId })}
        />
      )}
    </PhoneShell>
  );
}
