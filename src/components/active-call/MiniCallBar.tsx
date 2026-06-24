"use client";

import { Mic, MicOff, PhoneOff, Maximize2 } from "lucide-react";
import { useActiveCall } from "./ActiveCallStateContext";
import { useCallContext } from "@/components/providers/CallProvider";
import { useUI } from "@/components/providers/LocaleProvider";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function MiniCallBar() {
  const call = useActiveCall();
  const { expandCall, userLanguage, userName } = useCallContext();
  const ui = useUI(userLanguage);

  const partnerName = call.partner?.name || ui.waiting;
  const status =
    call.callStatus === "active"
      ? formatDuration(call.callDuration)
      : call.callStatus === "ringing"
        ? ui.ringing
        : ui.connecting;

  const latestTranslation = call.translations
    .filter((t) => t.speaker !== userName)
    .slice(-1)[0];

  return (
    <div className="mini-call-bar" role="region" aria-label={ui.callInProgress}>
      <button
        type="button"
        className="mini-call-bar-main"
        onClick={() => {
          void call.unlockAudio();
          void call.playRemoteAudio();
          expandCall();
        }}
      >
        <span className="mini-call-bar-pulse" aria-hidden />
        <span className="mini-call-bar-info">
          <span className="mini-call-bar-name">{partnerName}</span>
          <span className="mini-call-bar-status">{status}</span>
          {latestTranslation && (
            <span className="mini-call-bar-sub">{latestTranslation.translated}</span>
          )}
        </span>
        <Maximize2 className="w-5 h-5 shrink-0 opacity-70" />
      </button>

      <div className="mini-call-bar-actions">
        <button
          type="button"
          className={`mini-call-bar-btn ${call.isMuted ? "mini-call-bar-btn-muted" : ""}`}
          onClick={() => {
            void call.unlockAudio();
            call.toggleMute();
          }}
          title={call.isMuted ? ui.unmute : ui.mute}
        >
          {call.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          type="button"
          className="mini-call-bar-btn mini-call-bar-btn-end"
          onClick={() => call.endCall()}
          title={ui.endCall}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
