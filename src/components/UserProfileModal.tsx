"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { UserProfileCard, type UserProfileData } from "@/components/UserProfileCard";
import { TcallLogo } from "@/components/TcallLogo";
import { useCallContext } from "@/components/providers/CallProvider";
import { mapLookupUser } from "@/lib/user-profile";

interface UserProfileModalProps {
  tcallId: string;
  ui: Record<string, string>;
  onClose: () => void;
  onOpenChat?: (tcallId: string) => void;
}

export function UserProfileModal({ tcallId, ui, onClose, onOpenChat }: UserProfileModalProps) {
  const { dial } = useCallContext();
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiFetch(`/api/users/lookup?tcallId=${tcallId}`);
      const d = await r.json();
      if (!r.ok || !d.found) {
        setError(d.error || ui.userNotFound);
        setUser(null);
        return;
      }
      setUser(mapLookupUser(d.user));
    } catch {
      setError(ui.loadError);
    } finally {
      setLoading(false);
    }
  }, [tcallId, ui.userNotFound, ui.loadError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.chatActionFailed);
    } finally {
      setActionLoading(false);
    }
  };

  const blocked = user?.blockedYou || user?.blockedByYou;

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{ui.profile}</h3>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="py-8 flex justify-center">
            <TcallLogo size="sm" animate />
          </div>
        )}

        {error && !loading && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

        {user && !loading && (
          <UserProfileCard
            ui={ui}
            user={user}
            loading={actionLoading}
            onCall={() => {
              if (blocked) return;
              void dial(user.tcallId).then(() => onClose());
            }}
            onMessage={() => {
              if (blocked) return;
              onOpenChat?.(user.tcallId);
              onClose();
            }}
            onSendFriendRequest={() =>
              runAction(async () => {
                const r = await apiFetch("/api/friend-requests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tcallId: user.tcallId, name: user.name }),
                });
                if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error((d as { error?: string }).error || ui.chatActionFailed); }
              })
            }
            onAcceptFriendRequest={() =>
              runAction(async () => {
                await apiFetch("/api/friend-requests", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ senderTcallId: user.tcallId, accept: true }),
                });
              })
            }
            onCancelFriendRequest={() =>
              runAction(async () => {
                await apiFetch(`/api/friend-requests?tcallId=${user.tcallId}`, { method: "DELETE" });
              })
            }
            onBlock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tcallId: user.tcallId }),
                });
              })
            }
            onUnblock={() =>
              runAction(async () => {
                await apiFetch(`/api/blocks?tcallId=${user.tcallId}`, { method: "DELETE" });
              })
            }
            onRequestUnblock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks/unblock-request", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tcallId: user.tcallId }),
                });
              })
            }
            onAcceptUnblock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks/unblock-request", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ requesterTcallId: user.tcallId, accept: true }),
                });
              })
            }
            onRejectUnblock={() =>
              runAction(async () => {
                await apiFetch("/api/blocks/unblock-request", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ requesterTcallId: user.tcallId, accept: false }),
                });
              })
            }
            onRemoveFriend={
              user.isFriend
                ? () =>
                    runAction(async () => {
                      const listRes = await apiFetch("/api/contacts");
                      const listData = await listRes.json();
                      const contact = (listData.contacts || []).find(
                        (c: { tcallId: string; id: string }) => c.tcallId === user.tcallId
                      );
                      if (!contact?.id) throw new Error(ui.chatActionFailed);
                      const del = await apiFetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
                      if (!del.ok) throw new Error(ui.chatActionFailed);
                    })
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
