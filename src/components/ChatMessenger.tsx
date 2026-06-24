"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  MessageSquare,
  Paperclip,
  Phone,
  Plus,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getUI } from "@/lib/languages";
import { useCallContext } from "@/components/providers/CallProvider";
import { TcallLogo } from "@/components/TcallLogo";

const EMOJIS = [
  "😀", "😂", "😍", "🥰", "😊", "👍", "🙏", "❤️", "🔥", "✨",
  "👋", "🎉", "💯", "😢", "😡", "🤔", "👏", "💪", "🌟", "📞",
  "✅", "❌", "⏰", "📍", "💬", "🎵", "📷", "🎬", "🇺🇿", "🇷🇺",
];

export interface ChatMessageItem {
  id: string;
  type: string;
  originalText: string | null;
  sourceLang: string | null;
  displayText: string | null;
  mediaUrl: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  createdAt: string;
  sender: { id: string; name: string; tcallId: string | null; language: string };
  hasTranslation: boolean;
}

interface ConversationItem {
  id: string;
  type: string;
  title: string;
  unreadCount: number;
  updatedAt: string;
  lastMessage: ChatMessageItem | null;
  members: { userId: string; name: string; tcallId: string | null }[];
}

interface ChatMessengerProps {
  userLanguage: string;
  userId: string;
  onUnreadChange?: () => void;
  onThreadChange?: (inThread: boolean) => void;
  openTcallId?: string | null;
  openName?: string;
  onOpenHandled?: () => void;
}

export function ChatMessenger({
  userLanguage,
  userId,
  onUnreadChange,
  onThreadChange,
  openTcallId,
  openName,
  onOpenHandled,
}: ChatMessengerProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newTcallId, setNewTcallId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    onThreadChange?.(!!activeId);
  }, [activeId, onThreadChange]);

  useEffect(() => {
    return () => onThreadChange?.(false);
  }, [onThreadChange]);

  const loadConversations = useCallback(async () => {
    const r = await apiFetch("/api/chat/conversations");
    const d = await r.json();
    if (d.conversations) setConversations(d.conversations);
    onUnreadChange?.();
    setLoading(false);
  }, [onUnreadChange]);

  const openConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      setLoadingMsgs(true);
      setShowEmoji(false);
      const r = await apiFetch(`/api/chat/conversations/${id}`);
      const d = await r.json();
      setMessages(d.messages || []);
      setLoadingMsgs(false);
      await apiFetch(`/api/chat/conversations/${id}`, { method: "PATCH" });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
      onUnreadChange?.();
    },
    [onUnreadChange]
  );

  const startDirectChat = useCallback(
    async (tcallId: string) => {
      const r = await apiFetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcallId }),
      });
      const d = await r.json();
      if (!r.ok) return;
      await loadConversations();
      await openConversation(d.conversationId);
      setShowNewChat(false);
      setNewTcallId("");
    },
    [loadConversations, openConversation]
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!openTcallId) return;
    void (async () => {
      await startDirectChat(openTcallId);
      onOpenHandled?.();
    })();
  }, [openTcallId, startDirectChat, onOpenHandled]);

  useEffect(() => {
    const onChat = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        conversationId: string;
        message: ChatMessageItem;
      };
      if (!detail?.conversationId) {
        void loadConversations();
        return;
      }
      void loadConversations();
      if (detail.conversationId === activeId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === detail.message.id)) return prev;
          return [...prev, detail.message];
        });
        void apiFetch(`/api/chat/conversations/${detail.conversationId}`, { method: "PATCH" });
      }
    };
    window.addEventListener("tcall:chat-message", onChat);
    return () => window.removeEventListener("tcall:chat-message", onChat);
  }, [activeId, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async () => {
    if (!activeId || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), type: "text" }),
      });
      if (res.ok) {
        setText("");
        setShowEmoji(false);
        await openConversation(activeId);
      }
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file: File) => {
    if (!activeId || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await apiFetch("/api/chat/upload", { method: "POST", body: fd });
      const media = await up.json();
      if (!up.ok) return;
      await apiFetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: media.type,
          mediaUrl: media.url,
          mediaMime: media.mime,
          mediaName: media.name,
          mediaSize: media.size,
          text: text.trim() || undefined,
        }),
      });
      setText("");
      await openConversation(activeId);
    } finally {
      setUploading(false);
    }
  };

  const createGroup = async () => {
    const ids = groupMembers
      .split(/[\s,;]+/)
      .map((s) => s.replace(/\D/g, ""))
      .filter((s) => s.length === 9);
    if (!groupName.trim() || ids.length === 0) return;
    const r = await apiFetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", name: groupName, memberTcallIds: ids }),
    });
    const d = await r.json();
    if (r.ok) {
      setShowNewGroup(false);
      setGroupName("");
      setGroupMembers("");
      await loadConversations();
      await openConversation(d.conversationId);
    }
  };

  if (loading) {
    return (
      <div className="chat-app">
        <div className="chat-loading">
          <TcallLogo size="sm" animate />
        </div>
      </div>
    );
  }

  if (activeId && activeConv) {
    const partner = activeConv.members.find((m) => m.userId !== userId);
    return (
      <div className="chat-app chat-app-thread">
        <div className="chat-thread">
        <div className="chat-thread-header">
          <button type="button" onClick={() => setActiveId(null)} className="ios-icon-btn shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className={`chat-thread-avatar ${activeConv.type === "group" ? "chat-conv-avatar-group" : ""}`}>
            {activeConv.type === "group" ? (
              <Users className="w-5 h-5" />
            ) : (
              activeConv.title.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="chat-thread-title">{activeConv.title}</p>
            {activeConv.type === "direct" && partner?.tcallId && (
              <p className="chat-thread-sub">{formatTcallId(partner.tcallId)}</p>
            )}
            {activeConv.type === "group" && (
              <p className="text-xs text-slate-500 mt-0.5">{activeConv.members.length} {ui.chatMembers}</p>
            )}
          </div>
          {partner?.tcallId && (
            <button type="button" onClick={() => void dial(partner.tcallId!)} className="chat-thread-call-btn">
              <Phone className="w-5 h-5 text-green-600" />
            </button>
          )}
        </div>

        <div className="chat-messages">
          {loadingMsgs ? (
            <div className="chat-loading-inline"><TcallLogo size="xs" animate /></div>
          ) : messages.length === 0 ? (
            <p className="chat-empty-hint">{ui.chatEmptyThread}</p>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} msg={m} isMine={m.sender.id === userId} ui={ui} />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-composer">
          {showEmoji && (
            <div className="chat-emoji-panel">
              {EMOJIS.map((e) => (
                <button key={e} type="button" className="chat-emoji-btn" onClick={() => setText((t) => t + e)}>
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="chat-composer-row">
            <button type="button" className="chat-tool-btn" onClick={() => setShowEmoji((v) => !v)}>
              <Smile className="w-5 h-5" />
            </button>
            <button type="button" className="chat-tool-btn" onClick={() => mediaRef.current?.click()}>
              <ImagePlus className="w-5 h-5" />
            </button>
            <button type="button" className="chat-tool-btn" onClick={() => fileRef.current?.click()}>
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={mediaRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAndSend(f);
                e.target.value = "";
              }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="*/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAndSend(f);
                e.target.value = "";
              }}
            />
            <textarea
              className="chat-input"
              placeholder={ui.typeMessage}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendText();
                }
              }}
            />
            <button
              type="button"
              className="chat-send-btn"
              disabled={sending || uploading || !text.trim()}
              onClick={() => void sendText()}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app chat-app-list">
      <div className="chat-list-view">
      <div className="chat-list-actions">
        <button type="button" className="chat-action-btn" onClick={() => setShowNewChat(true)}>
          <Plus className="w-4 h-4" /> {ui.newChat}
        </button>
        <button type="button" className="chat-action-btn" onClick={() => setShowNewGroup(true)}>
          <Users className="w-4 h-4" /> {ui.newGroup}
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="ios-empty-state">
          <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
          <p>{ui.noMessages}</p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs text-center">{ui.chatHint}</p>
        </div>
      ) : (
        <ul className="chat-conv-list">
          {conversations.map((c) => (
            <li key={c.id}>
              <button type="button" className="chat-conv-item" onClick={() => void openConversation(c.id)}>
                <div className={`chat-conv-avatar ${c.type === "group" ? "chat-conv-avatar-group" : ""}`}>
                  {c.type === "group" ? <Users className="w-5 h-5" /> : c.title.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold truncate">{c.title}</p>
                    {c.lastMessage && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(c.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {c.lastMessage?.displayText || c.lastMessage?.originalText || "..."}
                  </p>
                </div>
                {c.unreadCount > 0 && <span className="chat-unread-badge">{c.unreadCount > 9 ? "9+" : c.unreadCount}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNewChat && (
        <div className="ios-modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="ios-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{ui.newChat}</h3>
              <button type="button" onClick={() => setShowNewChat(false)} className="ios-icon-btn"><X className="w-5 h-5" /></button>
            </div>
            <input
              className="input-field-compact font-mono mb-3"
              placeholder="123456789"
              value={newTcallId}
              onChange={(e) => setNewTcallId(e.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
            />
            <button
              type="button"
              className="btn-primary btn-compact w-full"
              disabled={newTcallId.length !== 9}
              onClick={() => void startDirectChat(newTcallId)}
            >
              {ui.startChat}
            </button>
          </div>
        </div>
      )}

      {showNewGroup && (
        <div className="ios-modal-overlay" onClick={() => setShowNewGroup(false)}>
          <div className="ios-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{ui.newGroup}</h3>
              <button type="button" onClick={() => setShowNewGroup(false)} className="ios-icon-btn"><X className="w-5 h-5" /></button>
            </div>
            <input
              className="input-field-compact mb-3"
              placeholder={ui.groupName}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <textarea
              className="input-field-compact min-h-[72px] mb-3 font-mono text-sm"
              placeholder={ui.groupMembersHint}
              value={groupMembers}
              onChange={(e) => setGroupMembers(e.target.value)}
            />
            <button type="button" className="btn-primary btn-compact w-full" onClick={() => void createGroup()}>
              {ui.createGroup}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  ui,
}: {
  msg: ChatMessageItem;
  isMine: boolean;
  ui: Record<string, string>;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const body = showOriginal ? msg.originalText : msg.displayText;

  return (
    <div className={`chat-bubble-wrap ${isMine ? "chat-bubble-mine" : "chat-bubble-theirs"}`}>
      {!isMine && msg.sender.name && (
        <p className="chat-bubble-sender">{msg.sender.name}</p>
      )}
      <div className={`chat-bubble ${isMine ? "chat-bubble-bg-mine" : "chat-bubble-bg-theirs"}`}>
        {msg.type === "image" && msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
            <img src={msg.mediaUrl} alt="" className="chat-media-image" />
          </a>
        )}
        {msg.type === "video" && msg.mediaUrl && (
          <video src={msg.mediaUrl} controls className="chat-media-video" playsInline />
        )}
        {msg.type === "file" && msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="chat-file-link">
            📎 {msg.mediaName || ui.chatFile}
          </a>
        )}
        {body && <p className="chat-bubble-text whitespace-pre-wrap">{body}</p>}
        {msg.hasTranslation && msg.originalText && (
          <button
            type="button"
            className="chat-view-original"
            onClick={() => setShowOriginal((v) => !v)}
          >
            {showOriginal ? ui.viewTranslation : ui.viewOriginal}
          </button>
        )}
      </div>
      <span className="chat-bubble-time">
        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}
