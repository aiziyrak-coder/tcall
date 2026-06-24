"use client";

import { useEffect, useState } from "react";
import { X, Phone, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getUI } from "@/lib/languages";
import { formatDuration } from "@/lib/status";
import { useCallContext } from "@/components/providers/CallProvider";
import { TcallLogo } from "@/components/TcallLogo";

interface CallDetailModalProps {
  roomId: string;
  userLanguage: string;
  userTcallId: string;
  onClose: () => void;
}

export function CallDetailModal({ roomId, userLanguage, userTcallId, onClose }: CallDetailModalProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();
  const [call, setCall] = useState<{
    status: string;
    durationSec?: number | null;
    transcriptSummary?: string | null;
    createdAt: string;
    host: { name: string; tcallId: string };
    participants: { user: { name: string; tcallId: string } }[];
    transcripts: { speakerName: string; originalText: string; translatedText?: string | null }[];
  } | null>(null);

  useEffect(() => {
    apiFetch(`/api/calls/detail?roomId=${roomId}`)
      .then((r) => r.json())
      .then((d) => setCall(d.call));
  }, [roomId]);

  if (!call) {
    return (
      <div className="ios-modal-overlay">
        <div className="ios-modal-panel flex items-center justify-center h-40">
          <TcallLogo size="sm" animate />
        </div>
      </div>
    );
  }

  const partner =
    call.host.tcallId !== userTcallId
      ? call.host
      : call.participants.find((p) => p.user.tcallId !== userTcallId)?.user;

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{ui.callDetail}</h2>
          <button onClick={onClose} className="ios-icon-btn"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-center py-2">
            <p className="text-xl font-semibold">{partner?.name || ui.unknown}</p>
            <p className="font-mono text-brand-600">{partner?.tcallId ? formatTcallId(partner.tcallId) : ""}</p>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(call.createdAt).toLocaleString()} · {ui.duration}: {formatDuration(call.durationSec)}
            </p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-white/10 capitalize">{call.status}</span>
          </div>

          {call.transcriptSummary && (
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> {ui.summary}</p>
              <p className="text-sm text-slate-700">{call.transcriptSummary}</p>
            </div>
          )}

          {call.transcripts.length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 mb-2">{ui.transcript}</p>
              <div className="space-y-2">
                {call.transcripts.map((t, i) => (
                  <div key={i} className="text-sm bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-brand-400 font-medium">{t.speakerName}: </span>
                    {t.translatedText || t.originalText}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500 text-sm">{ui.noTranscript}</p>
          )}
        </div>

        {partner?.tcallId && (
          <button
            onClick={() => { void dial(partner.tcallId); onClose(); }}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" /> {ui.startCall}
          </button>
        )}
      </div>
    </div>
  );
}
