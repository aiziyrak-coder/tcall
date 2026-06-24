"use client";

import { Mic, Loader2, AlertCircle, Settings } from "lucide-react";

interface MicPermissionGateProps {
  ui: Record<string, string>;
  status: "pending" | "requesting" | "denied";
  onAllow: () => void;
}

export function MicPermissionGate({ ui, status, onAllow }: MicPermissionGateProps) {
  const denied = status === "denied";

  return (
    <div className="phone-screen flex items-center justify-center p-5">
      <div className="mic-gate-card">
        <div className={`mic-gate-icon ${denied ? "mic-gate-icon-denied" : ""}`}>
          {denied ? <AlertCircle className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
        </div>

        <h2 className="mic-gate-title">
          {denied ? ui.micDeniedTitle : ui.micPermissionTitle}
        </h2>
        <p className="mic-gate-desc">
          {denied ? ui.micDeniedDesc : ui.micPermissionDesc}
        </p>

        {status === "requesting" ? (
          <div className="mic-gate-loading">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span>{ui.micPermissionWaiting}</span>
          </div>
        ) : (
          <button type="button" onClick={onAllow} className="mic-gate-btn">
            <Mic className="w-5 h-5" />
            {denied ? ui.micRetry : ui.micAllow}
          </button>
        )}

        {denied && (
          <p className="mic-gate-settings">
            <Settings className="w-3.5 h-3.5 inline mr-1" />
            {ui.micSettingsHint}
          </p>
        )}
      </div>
    </div>
  );
}
