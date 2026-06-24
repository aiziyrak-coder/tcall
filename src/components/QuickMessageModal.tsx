"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getUI } from "@/lib/languages";

const QUICK_TEMPLATES = [
  "Keyinroq qo'ng'iroq qiling",
  "Hozir bandman",
  "Xabar qoldiring",
  "Tez orada qo'ng'ira olasizmi?",
];

interface QuickMessageModalProps {
  recipientTcallId: string;
  recipientName?: string;
  userLanguage: string;
  onClose: () => void;
  onSent?: () => void;
}

export function QuickMessageModal({
  recipientTcallId,
  recipientName,
  userLanguage,
  onClose,
  onSent,
}: QuickMessageModalProps) {
  const ui = getUI(userLanguage);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientTcallId, message: text.trim() }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      onSent?.();
      setTimeout(onClose, 1200);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{ui.quickMessage}</h2>
            <p className="text-sm text-slate-500">{recipientName || formatTcallId(recipientTcallId)}</p>
          </div>
          <button onClick={onClose} className="ios-icon-btn"><X className="w-5 h-5" /></button>
        </div>

        {sent ? (
          <p className="text-center text-green-600 py-8">{ui.messageSent}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMessage(t)}
                  className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-black/5 active:bg-slate-200 touch-manipulation"
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              className="input-field-compact min-h-[72px] resize-none"
              placeholder={ui.typeMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
            />
            <button
              type="button"
              onClick={() => void send(message)}
              disabled={sending || !message.trim()}
              className="btn-primary btn-compact w-full mt-3 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> {ui.sendMessage}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
