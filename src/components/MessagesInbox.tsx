"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { useUI } from "@/components/providers/LocaleProvider";
import { useCallContext } from "@/components/providers/CallProvider";

interface MessagesInboxProps {
  userLanguage: string;
  onRead?: () => void;
}

export function MessagesInbox({ userLanguage, onRead }: MessagesInboxProps) {
  const ui = useUI(userLanguage);
  const { dial } = useCallContext();
  const [inbox, setInbox] = useState<Array<{
    id: string;
    message: string;
    read: boolean;
    createdAt: string;
    sender: { name: string; tcallId: string };
  }>>([]);

  useEffect(() => {
    apiFetch("/api/messages")
      .then((r) => r.json())
      .then((d) => {
        setInbox(d.inbox || []);
        const unread = (d.inbox || []).filter((m: { read: boolean }) => !m.read).map((m: { id: string }) => m.id);
        if (unread.length) {
          apiFetch("/api/messages", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: unread }),
          }).then(() => onRead?.());
        }
      });
  }, [onRead]);

  if (inbox.length === 0) {
    return (
      <div className="ios-empty-state">
        <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
        <p>{ui.noMessages}</p>
      </div>
    );
  }

  return (
    <ul className="ios-list">
      {inbox.map((msg) => (
        <li key={msg.id} className="ios-list-item flex-col items-start gap-1">
          <div className="flex w-full items-center justify-between">
            <p className="font-medium">{msg.sender.name}</p>
            <span className="text-xs text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p className="text-sm text-slate-600">{msg.message}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-slate-400">{formatTcallId(msg.sender.tcallId)}</span>
            <button
              onClick={() => void dial(msg.sender.tcallId)}
              className="text-xs text-brand-400 flex items-center gap-1"
            >
              <Phone className="w-3 h-3" /> {ui.startCall}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
