"use client";

import { Phone, PhoneOff } from "lucide-react";
import { getLanguage, getUI } from "@/lib/languages";
import { formatTcallId } from "@/lib/tcallId";
import type { IncomingCall } from "@/components/providers/CallProvider";

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
    <div className="incoming-call-overlay ios-call-screen">
      <div className="ios-call-bg" />
      <div className="ios-call-rings">
        <div className="ios-ring ios-ring-1" />
        <div className="ios-ring ios-ring-2" />
        <div className="ios-ring ios-ring-3" />
      </div>

      <div className="ios-call-body">
        <p className="text-white/50 text-sm mb-6">{ui.incomingCall}</p>

        <div className="phone-avatar ios-call-avatar mx-auto mb-5">
          <span>{call.caller.name.slice(0, 2).toUpperCase()}</span>
        </div>

        <h2 className="text-3xl font-semibold tracking-tight">{call.caller.name}</h2>
        <p className="text-brand-300 font-mono text-lg mt-2">{formatTcallId(call.caller.tcallId)}</p>
        <p className="text-white/40 text-sm mt-1">{callerLang.flag} {callerLang.name}</p>
      </div>

      <div className="ios-call-actions">
        <div className="ios-call-action-col">
          <button onClick={onReject} className="ios-call-btn ios-call-btn-reject" aria-label={ui.rejectCall}>
            <PhoneOff className="w-8 h-8" />
          </button>
          <span className="ios-call-btn-label">{ui.rejectCall}</span>
        </div>
        <div className="ios-call-action-col">
          <button onClick={onAccept} className="ios-call-btn ios-call-btn-accept" aria-label={ui.acceptCall}>
            <Phone className="w-8 h-8" />
          </button>
          <span className="ios-call-btn-label">{ui.acceptCall}</span>
        </div>
      </div>
    </div>
  );
}
