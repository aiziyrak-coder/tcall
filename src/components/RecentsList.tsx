"use client";

import { useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Info, User } from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage } from "@/lib/languages";
import { useUI } from "@/components/providers/LocaleProvider";
import { formatDuration } from "@/lib/status";
import { useCallContext, DialError } from "@/components/providers/CallProvider";
import { CallDetailModal } from "@/components/CallDetailModal";
import { UserProfileModal } from "@/components/UserProfileModal";

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

interface RecentsListProps {
  userLanguage: string;
  userTcallId: string;
  calls: CallRecord[];
  onOpenChat?: (tcallId: string) => void;
  compact?: boolean;
}

export function RecentsList({ userLanguage, userTcallId, calls, onOpenChat, compact }: RecentsListProps) {
  const ui = useUI(userLanguage);
  const { dial } = useCallContext();
  const [dialError, setDialError] = useState("");
  const [detailRoomId, setDetailRoomId] = useState<string | null>(null);
  const [profileTcallId, setProfileTcallId] = useState<string | null>(null);

  const handleDial = async (tcallId: string) => {
    setDialError("");
    try {
      await dial(tcallId);
    } catch (e) {
      setDialError(e instanceof DialError ? e.message : ui.dialError);
    }
  };

  if (calls.length === 0) {
    return (
      <div className={compact ? "ios-empty-state ios-empty-state-compact" : "ios-empty-state"}>
        <Phone className={compact ? "w-8 h-8 text-slate-300 mb-2" : "w-12 h-12 text-slate-300 mb-3"} />
        <p className={compact ? "text-sm text-slate-400" : undefined}>{ui.noCalls}</p>
      </div>
    );
  }

  return (
    <>
      {dialError && <div className="ios-error-banner mb-3">{dialError}</div>}
      <ul className={compact ? "ios-list ios-list-compact" : "ios-list"}>
        {calls.map((call) => {
          const isOutgoing = call.host.tcallId === userTcallId;
          const partner =
            call.host.tcallId !== userTcallId
              ? call.host
              : call.participants.find((p) => p.user.tcallId !== userTcallId)?.user;

          const isMissed =
            call.status === "missed" &&
            !isOutgoing &&
            call.calleeTcallId === userTcallId;

          const Icon = isMissed && !isOutgoing ? PhoneMissed : isOutgoing ? PhoneOutgoing : PhoneIncoming;

          const iconColor =
            isMissed && !isOutgoing ? "text-red-400"
            : isOutgoing ? "text-brand-400"
            : "text-green-600";

          const partnerLang = partner ? getLanguage(partner.language) : null;
          const date = new Date(call.createdAt);
          const timeStr =
            date.toLocaleDateString() === new Date().toLocaleDateString()
              ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : date.toLocaleDateString([], { month: "short", day: "numeric" });

          return (
            <li key={call.id} className={compact ? "ios-list-item ios-list-item-compact" : "ios-list-item"}>
              <Icon className={`${compact ? "w-4 h-4" : "w-5 h-5"} shrink-0 ${iconColor}`} />
              <button
                type="button"
                className="flex-1 min-w-0 text-left touch-manipulation"
                onClick={() => {
                  if (partner?.tcallId) setProfileTcallId(partner.tcallId);
                  else setDetailRoomId(call.roomId);
                }}
              >
                <p className="font-medium truncate">{partner?.name || ui.unknown}</p>
                <p className="text-xs text-slate-500">
                  {partnerLang?.flag}{" "}
                  {partner?.tcallId ? formatTcallId(partner.tcallId) : ""}
                  {call.durationSec ? ` · ${formatDuration(call.durationSec)}` : ""}
                </p>
              </button>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400">{timeStr}</span>
                <div className="flex gap-1">
                  {partner?.tcallId && (
                    <button
                      onClick={() => setProfileTcallId(partner.tcallId)}
                      className="ios-icon-btn w-8 h-8"
                      aria-label={ui.viewProfile}
                    >
                      <User className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setDetailRoomId(call.roomId)}
                    className="ios-icon-btn w-8 h-8"
                    aria-label={ui.callDetail}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  {partner?.tcallId && (
                    <button
                      onClick={() => void handleDial(partner.tcallId)}
                      className="ios-mini-call-btn"
                      aria-label={ui.startCall}
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {detailRoomId && (
        <CallDetailModal
          roomId={detailRoomId}
          userLanguage={userLanguage}
          userTcallId={userTcallId}
          onClose={() => setDetailRoomId(null)}
        />
      )}

      {profileTcallId && (
        <UserProfileModal
          tcallId={profileTcallId}
          ui={ui}
          onClose={() => setProfileTcallId(null)}
          onOpenChat={onOpenChat}
        />
      )}
    </>
  );
}
