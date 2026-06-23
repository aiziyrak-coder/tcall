"use client";

import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage, getUI } from "@/lib/languages";
import { useCallContext } from "@/components/providers/CallProvider";

interface CallRecord {
  id: string;
  roomId: string;
  status: string;
  createdAt: string;
  host: { name: string; language: string; tcallId: string };
  participants: { user: { name: string; language: string; tcallId: string } }[];
}

interface RecentsListProps {
  userLanguage: string;
  userTcallId: string;
  calls: CallRecord[];
}

export function RecentsList({ userLanguage, userTcallId, calls }: RecentsListProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();

  if (calls.length === 0) {
    return (
      <div className="ios-empty-state">
        <Phone className="w-12 h-12 text-white/15 mb-3" />
        <p>{ui.noCalls}</p>
      </div>
    );
  }

  return (
    <ul className="ios-list">
      {calls.map((call) => {
        const isOutgoing = call.host.tcallId === userTcallId;
        const partner =
          call.host.tcallId !== userTcallId
            ? call.host
            : call.participants.find((p) => p.user.tcallId !== userTcallId)?.user;

        const Icon =
          call.status === "ended" && !isOutgoing ? PhoneMissed
          : isOutgoing ? PhoneOutgoing
          : PhoneIncoming;

        const iconColor =
          call.status === "ended" && !isOutgoing ? "text-red-400"
          : isOutgoing ? "text-brand-400"
          : "text-green-400";

        const partnerLang = partner ? getLanguage(partner.language) : null;
        const date = new Date(call.createdAt);
        const timeStr = date.toLocaleDateString() === new Date().toLocaleDateString()
          ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString([], { month: "short", day: "numeric" });

        return (
          <li key={call.id} className="ios-list-item">
            <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0" onClick={() => partner?.tcallId && dial(partner.tcallId)}>
              <p className="font-medium truncate">{partner?.name || ui.unknown}</p>
              <p className="text-xs text-white/40">
                {partnerLang?.flag} {partner?.tcallId ? formatTcallId(partner.tcallId) : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-white/35">{timeStr}</span>
              {partner?.tcallId && (
                <button
                  onClick={() => dial(partner.tcallId)}
                  className="ios-mini-call-btn"
                  aria-label={ui.startCall}
                >
                  <Phone className="w-4 h-4" />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
