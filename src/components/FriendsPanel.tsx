"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Phone,
  MessageSquare,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  Check,
  X,
  UserPlus,
  Clock,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { useUI } from "@/components/providers/LocaleProvider";
import { useCallContext } from "@/components/providers/CallProvider";
import { TcallLogo } from "@/components/TcallLogo";
import { UserProfileCard, type UserProfileData } from "@/components/UserProfileCard";
import { UserProfileModal } from "@/components/UserProfileModal";
import { UserAvatar } from "@/components/UserAvatar";
import { mapLookupUser } from "@/lib/user-profile";

interface Friend {
  id: string;
  name: string;
  tcallId: string;
}

interface BlockItem {
  blockedTcallId: string;
  name: string | null;
}

interface IncomingUnblock {
  id: string;
  requester: { name: string; tcallId: string; language: string };
}

interface IncomingFriendReq {
  id: string;
  sender: { id: string; name: string; tcallId: string; language: string };
}

interface FriendsPanelProps {
  userLanguage: string;
  onOpenChat: (tcallId: string) => void;
}

export function FriendsPanel({ userLanguage, onOpenChat }: FriendsPanelProps) {
  const ui = useUI(userLanguage);
  const { dial } = useCallContext();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [incomingUnblocks, setIncomingUnblocks] = useState<IncomingUnblock[]>([]);
  const [incomingFriendReqs, setIncomingFriendReqs] = useState<IncomingFriendReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserProfileData | null>(null);
  const [searchError, setSearchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blockInput, setBlockInput] = useState("");
  const [profileModalId, setProfileModalId] = useState<string | null>(null);
  const [friendReqHint, setFriendReqHint] = useState("");

  const load = useCallback(async () => {
    const [friendsRes, blocksRes, unblockRes, friendReqRes] = await Promise.all([
      apiFetch("/api/contacts"),
      apiFetch("/api/blocks"),
      apiFetch("/api/blocks/unblock-request"),
      apiFetch("/api/friend-requests"),
    ]);
    const [friendsData, blocksData, unblockData, friendReqData] = await Promise.all([
      friendsRes.json(),
      blocksRes.json(),
      unblockRes.json(),
      friendReqRes.json(),
    ]);
    setFriends(friendsData.contacts || []);
    setBlocks(blocksData.blocks || []);
    setIncomingUnblocks(unblockData.incoming || []);
    setIncomingFriendReqs(friendReqData.incoming || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Real-time: yangi do'stlik so'rovi kelganda
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const onReq = () => { void loadRef.current(); };
    const onAcc = (e: Event) => {
      const detail = (e as CustomEvent).detail as { friend?: { name?: string } } | undefined;
      const name = detail?.friend?.name || ui.friendRequestAccepted as string;
      setFriendReqHint(`${name} — ${ui.friendRequestAccepted as string}`);
      setTimeout(() => setFriendReqHint(""), 4000);
      void loadRef.current();
    };
    window.addEventListener("tcall:friend-request", onReq);
    window.addEventListener("tcall:friend-accepted", onAcc);
    return () => {
      window.removeEventListener("tcall:friend-request", onReq);
      window.removeEventListener("tcall:friend-accepted", onAcc);
    };
  }, [ui]);

  useEffect(() => {
    const digits = searchId.replace(/\D/g, "");
    if (digits.length !== 9) {
      setSearchResult(null);
      setSearchError("");
      return;
    }
    const timer = setTimeout(() => void runSearch(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchId]);

  const runSearch = async () => {
    const digits = searchId.replace(/\D/g, "");
    if (digits.length !== 9) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await apiFetch(`/api/users/lookup?tcallId=${digits}`);
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error || ui.userNotFound); return; }
      if (!data.found) { setSearchError(ui.userNotFound); return; }
      setSearchResult(mapLookupUser(data.user));
    } catch {
      setSearchError(ui.loadError);
    } finally {
      setSearching(false);
    }
  };

  const runAction = async (fn: () => Promise<void>, refreshDigits?: string) => {
    setActionLoading(true);
    setActionError("");
    try {
      await fn();
      await load();
      if (refreshDigits && refreshDigits.length === 9) await runSearch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : ui.chatActionFailed);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCall = async (tcallId: string, blocked: boolean) => {
    if (blocked) { setActionError(ui.blockedCantCall); return; }
    setActionError("");
    try { await dial(tcallId); } catch { setActionError(ui.dialError); }
  };

  const handleMessage = (tcallId: string, blocked: boolean) => {
    if (blocked) { setActionError(ui.blockedCantMessage); return; }
    onOpenChat(tcallId);
  };

  const handleAcceptUnblock = async (requesterTcallId: string) => {
    await apiFetch("/api/blocks/unblock-request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterTcallId, accept: true }),
    });
    await load();
  };

  const handleRejectUnblock = async (requesterTcallId: string) => {
    await apiFetch("/api/blocks/unblock-request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterTcallId, accept: false }),
    });
    await load();
  };

  const handleAcceptFriendReq = async (senderTcallId: string) => {
    await apiFetch("/api/friend-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderTcallId, accept: true }),
    });
    await load();
  };

  const handleRejectFriendReq = async (senderTcallId: string) => {
    await apiFetch("/api/friend-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderTcallId, accept: false }),
    });
    await load();
  };

  const isBlocked = (u: UserProfileData) => !!(u.blockedYou || u.blockedByYou);

  if (loading) {
    return <div className="ios-empty-state"><TcallLogo size="sm" animate /></div>;
  }

  const totalBadge = incomingFriendReqs.length + incomingUnblocks.length;

  return (
    <div className="friends-panel">
      {actionError && <div className="ios-error-banner mb-3">{actionError}</div>}

      {friendReqHint && (
        <div className="friends-hint-banner mb-3">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <span>{friendReqHint}</span>
        </div>
      )}

      {/* Kiruvchi do'stlik so'rovlari */}
      {incomingFriendReqs.length > 0 && (
        <section className="friends-section">
          <h3 className="friends-section-title">
            <UserPlus className="w-4 h-4 text-brand-600" />
            {ui.incomingFriendRequests}
            <span className="friends-section-badge">{incomingFriendReqs.length}</span>
          </h3>
          <ul className="ios-list">
            {incomingFriendReqs.map((req) => (
              <li key={req.id} className="ios-list-item friends-unblock-item">
                <UserAvatar name={req.sender.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{req.sender.name}</p>
                  <p className="text-xs font-mono text-slate-500">{formatTcallId(req.sender.tcallId)}</p>
                  <p className="text-xs text-brand-600 mt-0.5 font-medium">{ui.incomingFriendRequests}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    className="friends-action-btn friends-action-call"
                    onClick={() => void handleAcceptFriendReq(req.sender.tcallId)}
                    title={ui.acceptFriend}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="friends-action-btn friends-action-danger"
                    onClick={() => void handleRejectFriendReq(req.sender.tcallId)}
                    title={ui.rejectFriend}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Kiruvchi unblock so'rovlari */}
      {incomingUnblocks.length > 0 && (
        <section className="friends-section">
          <h3 className="friends-section-title">{ui.incomingUnblockRequests}</h3>
          <ul className="ios-list">
            {incomingUnblocks.map((req) => (
              <li key={req.id} className="ios-list-item friends-unblock-item">
                <UserAvatar name={req.requester.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{req.requester.name}</p>
                  <p className="text-xs font-mono text-slate-500">{formatTcallId(req.requester.tcallId)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{ui.unblockRequestIncoming}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    className="friends-action-btn friends-action-call px-2"
                    onClick={() => void handleAcceptUnblock(req.requester.tcallId)}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="friends-action-btn friends-action-danger px-2"
                    onClick={() => void handleRejectUnblock(req.requester.tcallId)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Qidirish */}
      <section className="friends-section">
        <h3 className="friends-section-title">
          <Search className="w-4 h-4" /> {ui.searchUser}
        </h3>
        <div className="friends-search-row">
          <input
            className="input-field-compact flex-1 font-mono"
            placeholder={ui.searchByIdPlaceholder}
            value={searchId}
            onChange={(e) => setSearchId(e.target.value.replace(/\D/g, "").slice(0, 9))}
            inputMode="numeric"
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
          />
          <button
            type="button"
            className="btn-primary btn-compact shrink-0 px-4"
            disabled={searchId.replace(/\D/g, "").length !== 9 || searching}
            onClick={() => void runSearch()}
          >
            {searching ? "..." : ui.search}
          </button>
        </div>
        {searchError && <p className="friends-search-error">{searchError}</p>}

        {searchResult && (
          <UserProfileCard
            ui={ui}
            user={searchResult}
            loading={actionLoading}
            onCall={() => void handleCall(searchResult.tcallId, isBlocked(searchResult))}
            onMessage={() => handleMessage(searchResult.tcallId, isBlocked(searchResult))}
            onSendFriendRequest={() =>
              runAction(async () => {
                const r = await apiFetch("/api/friend-requests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tcallId: searchResult.tcallId, name: searchResult.name }),
                });
                if (!r.ok) {
                  const d = await r.json().catch(() => ({}));
                  throw new Error((d as { error?: string }).error || ui.chatActionFailed);
                }
              }, searchResult.tcallId)
            }
            onAcceptFriendRequest={() =>
              runAction(async () => {
                await apiFetch("/api/friend-requests", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ senderTcallId: searchResult.tcallId, accept: true }),
                });
              }, searchResult.tcallId)
            }
            onCancelFriendRequest={() =>
              runAction(async () => {
                await apiFetch(`/api/friend-requests?tcallId=${searchResult.tcallId}`, { method: "DELETE" });
              }, searchResult.tcallId)
            }
            onRemoveFriend={() =>
              runAction(async () => {
                const friend = friends.find((f) => f.tcallId === searchResult.tcallId);
                if (friend) await apiFetch(`/api/contacts/${friend.id}`, { method: "DELETE" });
              }, searchResult.tcallId)
            }
            onBlock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tcallId: searchResult.tcallId }),
                });
              }, searchResult.tcallId)
            }
            onUnblock={() =>
              runAction(async () => {
                await apiFetch(`/api/blocks?tcallId=${searchResult.tcallId}`, { method: "DELETE" });
              }, searchResult.tcallId)
            }
            onRequestUnblock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks/unblock-request", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tcallId: searchResult.tcallId }),
                });
              }, searchResult.tcallId)
            }
            onAcceptUnblock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks/unblock-request", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ requesterTcallId: searchResult.tcallId, accept: true }),
                });
              }, searchResult.tcallId)
            }
            onRejectUnblock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks/unblock-request", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ requesterTcallId: searchResult.tcallId, accept: false }),
                });
              }, searchResult.tcallId)
            }
          />
        )}
      </section>

      {/* Do'stlar ro'yxati */}
      <section className="friends-section">
        <h3 className="friends-section-title">{ui.friends}</h3>
        {friends.length === 0 ? (
          <p className="friends-empty">{ui.noFriendsDesc}</p>
        ) : (
          <ul className="ios-list">
            {friends.map((f) => {
              const blocked = blocks.some((b) => b.blockedTcallId === f.tcallId);
              return (
                <li key={f.id} className="ios-list-item ios-contact-item">
                  <button type="button" className="touch-manipulation shrink-0" onClick={() => setProfileModalId(f.tcallId)}>
                    <UserAvatar name={f.name} size="md" />
                  </button>
                  <button type="button" className="flex-1 min-w-0 text-left touch-manipulation" onClick={() => setProfileModalId(f.tcallId)}>
                    <p className="font-medium truncate">{f.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{formatTcallId(f.tcallId)}</p>
                  </button>
                  <div className="friends-row-actions">
                    <button type="button" className="ios-icon-btn w-10 h-10 text-slate-500" onClick={() => setProfileModalId(f.tcallId)} title={ui.viewProfile}>
                      <User className="w-4 h-4" />
                    </button>
                    <button type="button" className="ios-icon-btn w-10 h-10 text-brand-600" disabled={blocked} onClick={() => handleMessage(f.tcallId, blocked)} title="SMS">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button type="button" className="ios-mini-call-btn" disabled={blocked} onClick={() => void handleCall(f.tcallId, blocked)} title={ui.call}>
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="ios-icon-btn w-10 h-10 text-red-400"
                      onClick={() => void runAction(async () => {
                        const r = await apiFetch(`/api/contacts/${f.id}`, { method: "DELETE" });
                        if (!r.ok) throw new Error(ui.chatActionFailed);
                      })}
                      title={ui.removeFriend}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Qora ro'yxat */}
      <section className="friends-section">
        <button type="button" className="friends-blacklist-toggle" onClick={() => setShowBlacklist((v) => !v)}>
          <Shield className="w-4 h-4 text-red-500" />
          <span className="flex-1 text-left">
            {ui.blacklist}
            {blocks.length > 0 && <span className="friends-blacklist-count">{blocks.length}</span>}
          </span>
          {showBlacklist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showBlacklist && (
          <div className="friends-blacklist-body">
            <p className="friends-blacklist-desc">{ui.blacklistDesc}</p>
            <div className="friends-search-row mb-3">
              <input
                className="input-field-compact flex-1 font-mono"
                placeholder={ui.searchByIdPlaceholder}
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value.replace(/\D/g, "").slice(0, 9))}
                inputMode="numeric"
              />
              <button
                type="button"
                className="btn-secondary btn-compact shrink-0 px-3"
                disabled={blockInput.length !== 9}
                onClick={() => void runAction(async () => {
                  const r = await apiFetch("/api/blocks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tcallId: blockInput }),
                  });
                  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error((d as { error?: string }).error || ui.chatActionFailed); }
                  setBlockInput("");
                })}
              >
                {ui.block}
              </button>
            </div>
            {blocks.length === 0 ? (
              <p className="friends-empty">{ui.blacklistEmpty}</p>
            ) : (
              <ul className="ios-list">
                {blocks.map((b) => (
                  <li key={b.blockedTcallId} className="ios-list-item friends-block-item">
                    <button type="button" className="ios-contact-avatar bg-red-100 text-red-600 touch-manipulation" onClick={() => setProfileModalId(b.blockedTcallId)}>
                      {(b.name || "?")[0]?.toUpperCase()}
                    </button>
                    <button type="button" className="flex-1 min-w-0 text-left touch-manipulation" onClick={() => setProfileModalId(b.blockedTcallId)}>
                      <p className="font-medium truncate">{b.name || ui.unknownUser}</p>
                      <p className="text-xs font-mono text-slate-500">{formatTcallId(b.blockedTcallId)}</p>
                    </button>
                    <button
                      type="button"
                      className="friends-action-btn friends-action-danger shrink-0"
                      onClick={() => void runAction(async () => {
                        const r = await apiFetch(`/api/blocks?tcallId=${b.blockedTcallId}`, { method: "DELETE" });
                        if (!r.ok) throw new Error(ui.chatActionFailed);
                      })}
                    >
                      <ShieldOff className="w-3.5 h-3.5" /> {ui.unblock}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {profileModalId && (
        <UserProfileModal
          tcallId={profileModalId}
          ui={ui}
          onClose={() => { setProfileModalId(null); void load(); }}
          onOpenChat={onOpenChat}
        />
      )}
    </div>
  );
}
