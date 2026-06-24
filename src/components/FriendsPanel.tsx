"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Phone,
  MessageSquare,
  Search,
  UserPlus,
  Shield,
  ShieldOff,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage, getUI } from "@/lib/languages";
import { useCallContext } from "@/components/providers/CallProvider";
import { TcallLogo } from "@/components/TcallLogo";

interface Friend {
  id: string;
  name: string;
  tcallId: string;
}

interface BlockItem {
  blockedTcallId: string;
  name: string | null;
}

interface LookupUser {
  name: string;
  tcallId: string;
  language: string;
  status: string;
  online: boolean;
  blockedYou: boolean;
  blockedByYou: boolean;
  isFriend: boolean;
}

interface FriendsPanelProps {
  userLanguage: string;
  onOpenChat: (tcallId: string) => void;
}

export function FriendsPanel({ userLanguage, onOpenChat }: FriendsPanelProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<LookupUser | null>(null);
  const [searchError, setSearchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blockInput, setBlockInput] = useState("");

  const load = useCallback(async () => {
    const [friendsRes, blocksRes] = await Promise.all([
      apiFetch("/api/contacts"),
      apiFetch("/api/blocks"),
    ]);
    const friendsData = await friendsRes.json();
    const blocksData = await blocksRes.json();
    setFriends(friendsData.contacts || []);
    setBlocks(blocksData.blocks || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSearch = async () => {
    const digits = searchId.replace(/\D/g, "");
    if (digits.length !== 9) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await apiFetch(`/api/users/lookup?tcallId=${digits}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || ui.userNotFound);
        return;
      }
      if (!data.found) {
        setSearchError(ui.userNotFound);
        return;
      }
      setSearchResult(data.user);
    } catch {
      setSearchError(ui.loadError);
    } finally {
      setSearching(false);
    }
  };

  const addFriend = async (user: LookupUser) => {
    setActionError("");
    const res = await apiFetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user.name, tcallId: user.tcallId }),
    });
    if (!res.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    setSearchResult({ ...user, isFriend: true });
    await load();
  };

  const removeFriend = async (id: string) => {
    await apiFetch(`/api/contacts/${id}`, { method: "DELETE" });
    await load();
  };

  const blockUser = async (tcallId: string) => {
    setActionError("");
    const res = await apiFetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tcallId }),
    });
    if (!res.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    if (searchResult?.tcallId === tcallId) {
      setSearchResult({ ...searchResult, blockedByYou: true, isFriend: false });
    }
    await load();
  };

  const unblockUser = async (tcallId: string) => {
    await apiFetch(`/api/blocks?tcallId=${tcallId}`, { method: "DELETE" });
    if (searchResult?.tcallId === tcallId) {
      setSearchResult({ ...searchResult, blockedByYou: false });
    }
    await load();
  };

  const handleCall = async (tcallId: string, blocked: boolean) => {
    if (blocked) {
      setActionError(ui.blockedCantCall);
      return;
    }
    setActionError("");
    try {
      await dial(tcallId);
    } catch {
      setActionError(ui.dialError);
    }
  };

  const handleMessage = (tcallId: string, blocked: boolean) => {
    if (blocked) {
      setActionError(ui.blockedCantMessage);
      return;
    }
    onOpenChat(tcallId);
  };

  const isBlocked = (u: LookupUser) => u.blockedYou || u.blockedByYou;

  if (loading) {
    return (
      <div className="ios-empty-state">
        <TcallLogo size="sm" animate />
      </div>
    );
  }

  return (
    <div className="friends-panel">
      {actionError && <div className="ios-error-banner mb-3">{actionError}</div>}

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
          <div className="friends-search-result">
            <div className="friends-search-avatar">{searchResult.name.slice(0, 2).toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{searchResult.name}</p>
              <p className="text-xs text-slate-500 font-mono">{formatTcallId(searchResult.tcallId)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {getLanguage(searchResult.language).flag}{" "}
                {searchResult.online ? ui.online : ui.offline}
                {searchResult.blockedYou && ` · ${ui.blockedYou}`}
                {searchResult.blockedByYou && ` · ${ui.blocked}`}
              </p>
            </div>
            <div className="friends-action-row">
              {!searchResult.isFriend && !isBlocked(searchResult) && (
                <button
                  type="button"
                  className="friends-action-btn friends-action-primary"
                  onClick={() => void addFriend(searchResult)}
                >
                  <UserPlus className="w-4 h-4" /> {ui.addFriend}
                </button>
              )}
              {searchResult.isFriend && (
                <span className="friends-badge">{ui.alreadyFriend}</span>
              )}
              <button
                type="button"
                className="friends-action-btn"
                disabled={isBlocked(searchResult)}
                onClick={() => handleMessage(searchResult.tcallId, isBlocked(searchResult))}
              >
                <MessageSquare className="w-4 h-4" /> SMS
              </button>
              <button
                type="button"
                className="friends-action-btn friends-action-call"
                disabled={isBlocked(searchResult)}
                onClick={() => void handleCall(searchResult.tcallId, isBlocked(searchResult))}
              >
                <Phone className="w-4 h-4" /> {ui.call}
              </button>
              {searchResult.blockedByYou ? (
                <button
                  type="button"
                  className="friends-action-btn friends-action-danger"
                  onClick={() => void unblockUser(searchResult.tcallId)}
                >
                  <ShieldOff className="w-4 h-4" /> {ui.unblock}
                </button>
              ) : (
                <button
                  type="button"
                  className="friends-action-btn friends-action-danger"
                  onClick={() => void blockUser(searchResult.tcallId)}
                >
                  <Shield className="w-4 h-4" /> {ui.block}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

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
                  <div className="ios-contact-avatar">{f.name[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{f.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{formatTcallId(f.tcallId)}</p>
                  </div>
                  <div className="friends-row-actions">
                    <button
                      type="button"
                      className="ios-icon-btn w-10 h-10 text-brand-600"
                      disabled={blocked}
                      onClick={() => handleMessage(f.tcallId, blocked)}
                      title="SMS"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="ios-mini-call-btn"
                      disabled={blocked}
                      onClick={() => void handleCall(f.tcallId, blocked)}
                      title={ui.call}
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="ios-icon-btn w-10 h-10 text-red-400"
                      onClick={() => removeFriend(f.id)}
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

      <section className="friends-section">
        <button
          type="button"
          className="friends-blacklist-toggle"
          onClick={() => setShowBlacklist((v) => !v)}
        >
          <Shield className="w-4 h-4 text-red-500" />
          <span className="flex-1 text-left">
            {ui.blacklist}
            {blocks.length > 0 && (
              <span className="friends-blacklist-count">{blocks.length}</span>
            )}
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
                onClick={() => {
                  void blockUser(blockInput).then(() => setBlockInput(""));
                }}
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
                    <div className="ios-contact-avatar bg-red-100 text-red-600">
                      {(b.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{b.name || ui.unknownUser}</p>
                      <p className="text-xs font-mono text-slate-500">{formatTcallId(b.blockedTcallId)}</p>
                    </div>
                    <button
                      type="button"
                      className="friends-action-btn friends-action-danger shrink-0"
                      onClick={() => void unblockUser(b.blockedTcallId)}
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
    </div>
  );
}
