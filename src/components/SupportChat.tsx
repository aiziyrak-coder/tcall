"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headset, Loader2, Send, X } from "lucide-react";
import { apiFetch, parseApiJson } from "@/lib/api";

interface SupportMessage {
  id: string;
  sender: "user" | "admin";
  text: string;
  createdAt: string;
}

interface SupportChatProps {
  open: boolean;
  userLanguage: string;
  onClose: () => void;
}

const COPY = {
  uz: {
    title: "Qo'llab-quvvatlash", subtitle: "Admin bilan bog'laning — istalgan tilda yozing",
    placeholder: "Xabaringizni yozing...", send: "Yuborish", close: "Yopish",
    empty: "Savolingiz bormi? Bemalol yozing — tez orada javob beramiz.",
    hint: "Siz o'z tilingizda yozasiz, admin tarjimasini ko'radi va javobi sizning tilingizga tarjima bo'ladi.",
  },
  ru: {
    title: "Поддержка", subtitle: "Свяжитесь с админом — пишите на любом языке",
    placeholder: "Напишите сообщение...", send: "Отправить", close: "Закрыть",
    empty: "Есть вопрос? Пишите — ответим в ближайшее время.",
    hint: "Вы пишете на своём языке, админ видит перевод, а ответ переводится на ваш язык.",
  },
  en: {
    title: "Support", subtitle: "Contact admin — write in any language",
    placeholder: "Type your message...", send: "Send", close: "Close",
    empty: "Have a question? Write to us — we'll reply shortly.",
    hint: "You write in your language; the admin sees a translation and replies are translated back to your language.",
  },
} as const;

function getCopy(lang: string) {
  const code = lang.split("-")[0].toLowerCase();
  if (code === "uz") return COPY.uz;
  if (code === "ru") return COPY.ru;
  return COPY.en;
}

export function SupportChat({ open, userLanguage, onClose }: SupportChatProps) {
  const copy = getCopy(userLanguage);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/support");
      const data = await parseApiJson<{ messages?: SupportMessage[] }>(res);
      if (res.ok && data.messages) setMessages(data.messages);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
    pollRef.current = setInterval(() => void load(), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!open) return null;

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError("");
    // Optimistik ko'rsatish
    const optimistic: SupportMessage = { id: `tmp-${Date.now()}`, sender: "user", text: t, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    try {
      const res = await apiFetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Xatolik");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel max-w-lg w-[94vw] flex flex-col" style={{ height: "min(80vh, 640px)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center"><Headset className="w-5 h-5" /></span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{copy.title}</h3>
              <p className="text-xs text-slate-500">{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label={copy.close}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2">
          {loading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <Headset className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">{copy.empty}</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.sender === "user" ? "bg-brand-600 text-white rounded-br-md" : "bg-slate-100 text-slate-800 rounded-bl-md"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.sender === "user" ? "text-white/70" : "text-slate-400"}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {error && <div className="ios-error-banner mb-2">{error}</div>}
        <p className="text-[11px] text-slate-400 mb-2">{copy.hint}</p>

        <div className="flex items-end gap-2 pt-2 border-t border-black/5">
          <textarea
            className="input-field-compact flex-1 min-h-[44px] max-h-28 resize-none"
            placeholder={copy.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            maxLength={2000}
            rows={1}
          />
          <button type="button" onClick={() => void send()} disabled={sending || !text.trim()} className="btn-primary btn-compact shrink-0 h-11 px-4 flex items-center gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
