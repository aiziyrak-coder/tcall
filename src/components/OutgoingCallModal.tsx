"use client";

import { PhoneOff } from "lucide-react";
import { getLanguage, getUI } from "@/lib/languages";
import { formatTcallId } from "@/lib/tcallId";
import type { OutgoingCall } from "@/components/providers/CallProvider";

interface OutgoingCallModalProps {
  call: OutgoingCall;
  userLanguage: string;
  onCancel: () => void;
}

export function OutgoingCallModal({ call, userLanguage, onCancel }: OutgoingCallModalProps) {
  const ui = getUI(userLanguage);
  const lang = getLanguage(call.callee.language);

  return (
    <div className="incoming-call-overlay ios-call-screen">
      <div className="ios-call-bg" />
      <div className="ios-call-rings">
        <div className="ios-ring ios-ring-1" />
        <div className="ios-ring ios-ring-2" />
        <div className="ios-ring ios-ring-3" />
      </div>

      <div className="ios-call-body">
        <p className="text-slate-500 text-sm mb-6">{ui.ringing}</p>

        <div className="phone-avatar ios-call-avatar mx-auto mb-5">
          <span>{call.callee.name.slice(0, 2).toUpperCase()}</span>
        </div>

        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{call.callee.name}</h2>
        <p className="text-slate-600 font-mono text-lg mt-2">{formatTcallId(call.callee.tcallId)}</p>
        <p className="text-slate-500 text-sm mt-1">{lang.flag} {lang.name}</p>

        <p className="text-slate-400 text-xs mt-8 animate-pulse">{ui.waitingForAnswer}</p>
      </div>

      <div className="ios-call-actions">
        <div className="ios-call-action-col">
          <button onClick={onCancel} className="ios-call-btn ios-call-btn-reject" aria-label={ui.cancelCall}>
            <PhoneOff className="w-8 h-8" />
          </button>
          <span className="ios-call-btn-label">{ui.cancelCall}</span>
        </div>
      </div>
    </div>
  );
}
