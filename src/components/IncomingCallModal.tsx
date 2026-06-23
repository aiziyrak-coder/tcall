"use client";

import { PhoneOff, Phone } from "lucide-react";
import { getLanguage, getUI } from "@/lib/languages";
import { formatTcallId } from "@/lib/tcallId";
import type { IncomingCall } from "@/hooks/usePresence";

interface IncomingCallModalProps {
  call: IncomingCall;
  userLanguage: string;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({ call, userLanguage, onAccept, onReject }: IncomingCallModalProps) {
  const ui = getUI(userLanguage);
  const callerLang = getLanguage(call.caller.language);

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-pulse" />
      <div className="incoming-call-content">
        <p className="text-white/60 text-sm mb-2">{ui.incomingCall}</p>
        <div className="phone-avatar mx-auto mb-4 incoming-avatar">
          <span>{call.caller.name.slice(0, 2).toUpperCase()}</span>
        </div>
        <h2 className="text-2xl font-bold">{call.caller.name}</h2>
        <p className="text-brand-300 font-mono mt-1">{formatTcallId(call.caller.tcallId)}</p>
        <p className="text-white/50 text-sm mt-1">{callerLang.flag} {callerLang.name}</p>

        <div className="flex justify-center gap-8 mt-10">
          <button onClick={onReject} className="incoming-btn incoming-reject" aria-label={ui.rejectCall}>
            <PhoneOff className="w-7 h-7" />
          </button>
          <button onClick={onAccept} className="incoming-btn incoming-accept" aria-label={ui.acceptCall}>
            <Phone className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
