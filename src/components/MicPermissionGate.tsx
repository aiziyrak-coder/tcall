"use client";

import { Mic, AlertCircle, Settings } from "lucide-react";
import { TcallLogo } from "@/components/TcallLogo";

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
        {denied ? (
          <div className="mic-gate-icon mic-gate-icon-denied">
            <AlertCircle className="w-8 h-8" />
          </div>
        ) : (
          <TcallLogo size="lg" animate className="mb-1" />
        )}

        <h2 className="mic-gate-title">
          {denied ? ui.micDeniedTitle : ui.micPermissionTitle}
        </h2>
        <p className="mic-gate-desc">
          {denied ? ui.micDeniedDesc : ui.micPermissionDesc}
        </p>

        {status === "requesting" ? (
          <div className="mic-gate-loading">
            <TcallLogo size="xs" animate />
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
