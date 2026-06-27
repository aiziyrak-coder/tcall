"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  ArrowLeft,
  ArrowDown,
  Check,
  CheckCheck,
  ImagePlus,
  MessageSquare,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Trash2,
  Users,
  X,
  Pin,
  Play,
  Pencil,
  CornerUpLeft,
  Copy,
  Forward,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { prepareAvatarFile } from "@/lib/prepare-avatar-file";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage } from "@/lib/languages";
import { useUI } from "@/components/providers/LocaleProvider";
import { resolveChatMediaUrl } from "@/lib/chat-media-url";
import {
  isChatAudioMessage,
  isChatImageMessage,
  isChatVideoMessage,
} from "@/lib/chat-media";
import type { ChatViewerItem } from "@/components/ChatMediaViewer";
import { bindTelegramBackButton } from "@/hooks/useTelegramWebApp";
import { useCallContext } from "@/components/providers/CallProvider";
import { ChatGroupMembersPanel } from "@/components/ChatGroupMembersPanel";
import { ChatThreadMenuSheet } from "@/components/ChatThreadMenuSheet";
import { UserProfileModal } from "@/components/UserProfileModal";
import { GroupAvatar, UserAvatar } from "@/components/UserAvatar";
import { TcallLogo } from "@/components/TcallLogo";
import { ChatConvSkeleton } from "@/components/Skeleton";
import { ReportModal } from "@/components/ReportModal";
import { applyReadStatusAfterPeerRead } from "@/lib/chat-read-status";
import { peerStatusLabel } from "@/lib/format-last-seen";
import { formatChatDateLabel, sameChatDay } from "@/lib/chat-date";
import {
  bindSwipeDownDismiss,
  dismissKeyboard,
  isTextInputFocused,
  shouldDismissOnPointerTarget,
} from "@/lib/dismiss-keyboard";
import { startVoiceRecord, stopVoiceRecord, type VoiceRecordSession } from "@/lib/chat-voice-record";
import { ChatMediaViewer } from "@/components/ChatMediaViewer";
import { VoiceMessageBubble } from "@/components/VoiceMessageBubble";
import { emitSubscriptionRequired, extractSubscriptionRequirement } from "@/lib/subscription-required";
import { copyToClipboard } from "@/lib/utils";
import { linkifyText } from "@/lib/linkify-text";

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
  readStatus?: "sent" | "read";
  deleted?: boolean;
  edited?: boolean;
  pinned?: boolean;
  replyTo?: { id: string; senderName: string; preview: string } | null;
  reactions?: { emoji: string; count: number; mine?: boolean }[];
}

interface ConversationItem {
  id: string;
  type: string;
  title: string;
  avatar?: string | null;
  createdById?: string;
  unreadCount: number;
  updatedAt: string;
  peerOnline?: boolean;
  peerLastSeenAt?: string | null;
  lastPreview?: string;
  lastMessage: ChatMessageItem | null;
  members: { userId: string; name: string; tcallId: string | null; avatar?: string | null; language?: string; role?: string }[];
  pinnedAt?: string | null;
}

interface PeerPresence {
  userId: string;
  online: boolean;
  lastSeenAt: string | null;
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
  const ui = useUI(userLanguage);
  const { dial, getSocket, activeCall } = useCallContext();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [peerPresence, setPeerPresence] = useState<PeerPresence | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerDraft, setPeerDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchMode, setMessageSearchMode] = useState(false);
  const [messageSearchResults, setMessageSearchResults] = useState<
    { id: string; conversationId: string; conversationName: string | null; text: string | null; createdAt: string }[]
  >([]);
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [threadSearchResults, setThreadSearchResults] = useState<
    { id: string; text: string | null; createdAt: string }[]
  >([]);
  const [threadSearchLoading, setThreadSearchLoading] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [unreadBeforeAt, setUnreadBeforeAt] = useState<Date | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ChatMessageItem | null>(null);
  const [forwarding, setForwarding] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [showReportChat, setShowReportChat] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [conversationType, setConversationType] = useState<string>("direct");
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newTcallId, setNewTcallId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [showRenameGroup, setShowRenameGroup] = useState(false);
  const [showPartnerProfile, setShowPartnerProfile] = useState(false);
  const [groupAvatarUploading, setGroupAvatarUploading] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [mediaViewer, setMediaViewer] = useState<{ items: ChatViewerItem[]; index: number } | null>(null);
  const groupAvatarRef = useRef<HTMLInputElement>(null);
  const chatManageBtnRef = useRef<HTMLButtonElement>(null);
  const voiceSessionRef = useRef<VoiceRecordSession | null>(null);
  const voiceRecordStartedRef = useRef(0);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      const session = voiceSessionRef.current;
      voiceSessionRef.current = null;
      if (session) {
        try {
          session.recorder.stop();
        } catch {
          /* ignore */
        }
        session.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesWrapRef = useRef<HTMLDivElement>(null);
  const threadHeaderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const attachWrapRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);
  const typingEmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  activeIdRef.current = activeId;

  const syncInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const max = 128;
    const min = 44;
    const next = Math.min(Math.max(el.scrollHeight, min), max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    syncInputHeight();
  }, [text, syncInputHeight, activeId]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const onDoc = (e: MouseEvent) => {
      if (attachWrapRef.current && !attachWrapRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showAttachMenu]);

  useEffect(() => {
    if (!activeId) return;
    const cleanups: Array<() => void> = [];
    if (messagesWrapRef.current) {
      cleanups.push(bindSwipeDownDismiss(messagesWrapRef.current));
    }
    if (threadHeaderRef.current) {
      cleanups.push(bindSwipeDownDismiss(threadHeaderRef.current));
    }
    return () => cleanups.forEach((fn) => fn());
  }, [activeId]);

  const handleMessagesPointerDown = useCallback((e: React.PointerEvent) => {
    if (!shouldDismissOnPointerTarget(e.target)) return;
    if (isTextInputFocused()) dismissKeyboard();
    setShowEmoji(false);
    setShowAttachMenu(false);
  }, []);

  const activeConv = conversations.find((c) => c.id === activeId);

  const handleSubscriptionRequirement = useCallback(
    (status: number, payload: unknown, source: string): string | null => {
      const required = extractSubscriptionRequirement(status, payload);
      if (!required) return null;
      emitSubscriptionRequired({ ...required, source });
      const body =
        payload && typeof payload === "object"
          ? (payload as { error?: string })
          : null;
      return body?.error || ui.chatActionFailed;
    },
    [ui.chatActionFailed]
  );

  useEffect(() => {
    onThreadChange?.(!!activeId);
  }, [activeId, onThreadChange]);

  useEffect(() => {
    return () => {
      onThreadChange?.(false);
    };
  }, [onThreadChange]);

  // Komponent yopilganda typing holati va timer tozalansin
  useEffect(() => {
    return () => {
      // Typing timer
      if (typingEmitRef.current) {
        clearTimeout(typingEmitRef.current);
        typingEmitRef.current = null;
      }
      // Socket emit
      const socket = getSocket();
      if (socket?.connected && activeIdRef.current) {
        socket.emit("chat-typing-stop", { conversationId: activeIdRef.current });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(""), 6000);
    return () => clearTimeout(t);
  }, [uploadError]);

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(""), 6000);
    return () => clearTimeout(t);
  }, [actionError]);

  const closeThread = useCallback(() => {
    setActiveId(null);
    setPeerPresence(null);
    setShowManage(false);
    setShowAddMembers(false);
    setShowMembers(false);
    setShowRenameGroup(false);
  }, []);

  useEffect(() => {
    return bindTelegramBackButton(closeThread, !!activeId);
  }, [activeId, closeThread]);

  const loadConversations = useCallback(async () => {
    const r = await apiFetch("/api/chat/conversations");
    const d = await r.json();
    if (d.conversations) setConversations(d.conversations);
    onUnreadChange?.();
    setLoading(false);
  }, [onUnreadChange]);

  const togglePin = useCallback(async (conversationId: string, pinned: boolean) => {
    await apiFetch("/api/chat/pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, pinned }),
    });
    await loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!messageSearchMode) {
      setMessageSearchResults([]);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setMessageSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setMessageSearchLoading(true);
      void apiFetch(`/api/chat/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setMessageSearchResults(d.results || []))
        .finally(() => setMessageSearchLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [messageSearchMode, searchQuery]);

  useEffect(() => {
    if (!threadSearchOpen || !activeId) {
      setThreadSearchResults([]);
      return;
    }
    const q = threadSearchQuery.trim();
    if (q.length < 2) {
      setThreadSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      setThreadSearchLoading(true);
      void apiFetch(
        `/api/chat/search?q=${encodeURIComponent(q)}&conversationId=${encodeURIComponent(activeId)}`
      )
        .then((r) => r.json())
        .then((d) => setThreadSearchResults(d.results || []))
        .finally(() => setThreadSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [threadSearchOpen, threadSearchQuery, activeId]);

  const firstUnreadId = useMemo(() => {
    if (!unreadBeforeAt) return null;
    const boundary = unreadBeforeAt.getTime();
    for (const m of messages) {
      if (m.sender.id !== userId && new Date(m.createdAt).getTime() > boundary) return m.id;
    }
    return null;
  }, [messages, unreadBeforeAt, userId]);

  const refreshAndOpenMembers = useCallback(async () => {
    setShowManage(false);
    await loadConversations();
    setShowMembers(true);
  }, [loadConversations]);

  const openConversation = useCallback(
    async (id: string, options?: { scrollToMessageId?: string }) => {
      setActiveId(id);
      setLoadingMsgs(true);
      setShowEmoji(false);
      setHasMore(false);
      setPeerTyping(false);
      setThreadSearchOpen(false);
      setThreadSearchQuery("");
      setThreadSearchResults([]);
      atBottomRef.current = true;

      const conv = conversations.find((c) => c.id === id);
      setConversationType(conv?.type ?? "direct");

      const savedDraft = typeof window !== "undefined" ? localStorage.getItem(`tcall:draft:${id}`) : null;
      setText(savedDraft || "");

      const r = await apiFetch(`/api/chat/conversations/${id}`);
      const d = await r.json();

      if (activeIdRef.current !== id) return;

      const fetched: ChatMessageItem[] = d.messages || [];
      const lastRead = d.lastReadAt ? new Date(d.lastReadAt) : null;
      setUnreadBeforeAt(lastRead);

      setMessages((prev) => {
        const ids = new Set(fetched.map((m) => m.id));
        const extra = prev.filter((m) => !ids.has(m.id));
        return [...fetched, ...extra].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
      setHasMore(!!d.hasMore);
      setPinnedMessages(d.pinnedMessages || []);
      setReplyTarget(null);
      setEditingMessage(null);

      if (d.peer) {
        setPeerPresence(d.peer);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  peerOnline: d.peer.online,
                  peerLastSeenAt: d.peer.lastSeenAt,
                }
              : c
          )
        );
      } else {
        setPeerPresence(null);
      }
      setLoadingMsgs(false);

      const jumpId =
        options?.scrollToMessageId ||
        (lastRead
          ? fetched.find((m) => m.sender.id !== userId && new Date(m.createdAt) > lastRead)?.id
          : undefined);

      if (jumpId) {
        requestAnimationFrame(() => {
          const el = document.getElementById(`chat-msg-${jumpId}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightMessageId(jumpId);
          setTimeout(() => setHighlightMessageId(null), 2200);
        });
      }

      await apiFetch(`/api/chat/conversations/${id}`, { method: "PATCH" });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
      onUnreadChange?.();
    },
    [onUnreadChange, conversations, userId]
  );

  const loadOlderMessages = useCallback(async () => {
    if (!activeId || loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const cursor = messages[0].createdAt;
    const el = messagesRef.current;
    const prevHeight = el?.scrollHeight ?? 0;

    try {
      const r = await apiFetch(`/api/chat/conversations/${activeId}?cursor=${encodeURIComponent(cursor)}`);
      const d = await r.json();
      if (activeIdRef.current !== activeId) return;

      const older: ChatMessageItem[] = d.messages || [];
      setHasMore(!!d.hasMore);
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...older.filter((m) => !ids.has(m.id)), ...prev];
        return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });

      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingOlder(false);
    }
  }, [activeId, loadingOlder, hasMore, messages]);

  const startDirectChat = useCallback(
    async (tcallId: string) => {
      const r = await apiFetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcallId }),
      });
      const d = await r.json();
      if (!r.ok) {
        const msg =
          handleSubscriptionRequirement(r.status, d, "chat-start") ||
          (d as { error?: string }).error ||
          ui.chatActionFailed;
        setActionError(msg);
        return;
      }
      await loadConversations();
      await openConversation(d.conversationId);
      setShowNewChat(false);
      setNewTcallId("");
    },
    [
      loadConversations,
      openConversation,
      ui.chatActionFailed,
      handleSubscriptionRequirement,
    ]
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
          const incoming = detail.message;
          const message =
            incoming.sender.id === userId && !incoming.readStatus
              ? { ...incoming, readStatus: "sent" as const }
              : incoming;
          return [...prev, message];
        });
        void apiFetch(`/api/chat/conversations/${detail.conversationId}`, { method: "PATCH" });
      }
    };
    window.addEventListener("tcall:chat-message", onChat);
    return () => window.removeEventListener("tcall:chat-message", onChat);
  }, [activeId, loadConversations, userId]);

  useEffect(() => {
    const onRead = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        conversationId: string;
        readerId: string;
        readAt: string;
        conversationType?: string;
      };
      if (!detail?.conversationId || detail.conversationId !== activeId) return;
      setMessages((prev) =>
        applyReadStatusAfterPeerRead(
          prev,
          detail.readerId,
          detail.readAt,
          userId,
          detail.conversationType
        )
      );
    };
    window.addEventListener("tcall:chat-read", onRead);
    return () => window.removeEventListener("tcall:chat-read", onRead);
  }, [activeId, userId]);

  useEffect(() => {
    const onDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail as { conversationId: string; messageId: string };
      if (!detail?.conversationId || detail.conversationId !== activeId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === detail.messageId
            ? {
                ...m,
                type: "text",
                originalText: null,
                displayText: ui.chatMessageDeleted,
                mediaUrl: null,
                mediaMime: null,
                mediaName: null,
                deleted: true,
                hasTranslation: false,
                replyTo: null,
              }
            : m
        )
      );
      setPinnedMessages((prev) => prev.filter((m) => m.id !== detail.messageId));
      void loadConversations();
    };
    window.addEventListener("tcall:chat-message-deleted", onDeleted);
    return () => window.removeEventListener("tcall:chat-message-deleted", onDeleted);
  }, [activeId, loadConversations, ui.chatMessageDeleted]);

  useEffect(() => {
    const onHidden = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        conversationId: string;
        messageId: string;
        userId: string;
      };
      if (!detail?.conversationId || detail.conversationId !== activeId) return;
      if (detail.userId !== userId) return;
      setMessages((prev) => prev.filter((m) => m.id !== detail.messageId));
      setPinnedMessages((prev) => prev.filter((m) => m.id !== detail.messageId));
      void loadConversations();
    };
    window.addEventListener("tcall:chat-message-hidden", onHidden);
    return () => window.removeEventListener("tcall:chat-message-hidden", onHidden);
  }, [activeId, userId, loadConversations]);

  useEffect(() => {
    const onEdited = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        conversationId: string;
        messageId: string;
        message: ChatMessageItem;
      };
      if (!detail?.conversationId || detail.conversationId !== activeId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === detail.messageId ? { ...m, ...detail.message } : m))
      );
      setPinnedMessages((prev) =>
        prev.map((m) => (m.id === detail.messageId ? { ...m, ...detail.message } : m))
      );
      void loadConversations();
    };
    window.addEventListener("tcall:chat-message-edited", onEdited);
    return () => window.removeEventListener("tcall:chat-message-edited", onEdited);
  }, [activeId, loadConversations]);

  useEffect(() => {
    const onPin = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        conversationId: string;
        messageId: string;
        pinned: boolean;
      };
      if (!detail?.conversationId || detail.conversationId !== activeId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === detail.messageId ? { ...m, pinned: detail.pinned } : m))
      );
      if (detail.pinned) {
        const msg = messages.find((m) => m.id === detail.messageId);
        if (msg) {
          setPinnedMessages((prev) => {
            if (prev.some((p) => p.id === detail.messageId)) return prev;
            return [...prev, { ...msg, pinned: true }];
          });
        } else {
          void openConversation(activeId!);
        }
      } else {
        setPinnedMessages((prev) => prev.filter((m) => m.id !== detail.messageId));
      }
    };
    window.addEventListener("tcall:chat-message-pin", onPin);
    return () => window.removeEventListener("tcall:chat-message-pin", onPin);
  }, [activeId, messages, openConversation]);

  useEffect(() => {
    const onTyping = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        conversationId: string;
        userId: string;
        typing: boolean;
        draft?: string;
      };
      if (!detail?.conversationId || detail.conversationId !== activeId) return;
      if (detail.userId === userId) return;
      setPeerTyping(detail.typing);
      setPeerDraft(detail.typing ? (detail.draft || "") : "");
    };
    window.addEventListener("tcall:chat-typing", onTyping);
    return () => window.removeEventListener("tcall:chat-typing", onTyping);
  }, [activeId, userId]);

  // Reaksiyalar — socket orqali real-time yangilanish
  useEffect(() => {
    const onReaction = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        messageId: string;
        conversationId: string;
        summary: { emoji: string; count: number }[];
      };
      if (!detail?.messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === detail.messageId ? { ...m, reactions: detail.summary.map((r) => ({ ...r, mine: false })) } : m
        )
      );
    };
    window.addEventListener("tcall:message-reaction", onReaction);
    return () => window.removeEventListener("tcall:message-reaction", onReaction);
  }, []);

  useEffect(() => {
    const onPresence = (e: Event) => {
      const detail = (e as CustomEvent).detail as PeerPresence;
      if (!detail?.userId) return;

      setConversations((prev) =>
        prev.map((c) => {
          if (c.type !== "direct") return c;
          const peer = c.members.find((m) => m.userId !== userId);
          if (peer?.userId !== detail.userId) return c;
          return {
            ...c,
            peerOnline: detail.online,
            peerLastSeenAt: detail.lastSeenAt,
          };
        })
      );

      if (peerPresence?.userId === detail.userId) {
        setPeerPresence(detail);
      }
    };
    window.addEventListener("tcall:chat-presence", onPresence);
    return () => window.removeEventListener("tcall:chat-presence", onPresence);
  }, [peerPresence?.userId, userId]);

  useEffect(() => {
    if (!atBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ behavior: loadingOlder ? "auto" : "smooth" });
  }, [messages, loadingOlder]);

  useEffect(() => {
    if (!activeId) return;
    if (text.trim()) localStorage.setItem(`tcall:draft:${activeId}`, text);
    else localStorage.removeItem(`tcall:draft:${activeId}`);
  }, [text, activeId]);

  const emitTyping = useCallback(() => {
    if (!activeId) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit("chat-typing", { conversationId: activeId, draft: text.slice(0, 500) });
  }, [activeId, getSocket, text]);

  const stopTyping = useCallback(() => {
    if (!activeId) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    socket.emit("chat-typing-stop", { conversationId: activeId });
  }, [activeId, getSocket]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    if (isTextInputFocused()) dismissKeyboard();
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = dist < 80;
    setShowScrollDown(dist > 120);
    if (el.scrollTop < 80 && hasMore && !loadingOlder) {
      void loadOlderMessages();
    }
  }, [hasMore, loadingOlder, loadOlderMessages]);

  const scrollToBottom = useCallback(() => {
    atBottomRef.current = true;
    setShowScrollDown(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const [pendingDelete, setPendingDelete] = useState<{
    messageId: string;
    canDeleteForEveryone: boolean;
    isDirect: boolean;
  } | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessageItem | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessageItem | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessageItem[]>([]);

  const deleteMessage = (msg: ChatMessageItem, canDeleteForEveryone: boolean, isDirect: boolean) => {
    setPendingDelete({ messageId: msg.id, canDeleteForEveryone, isDirect });
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const r = await apiFetch("/api/chat/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (r.ok) {
        const data = await r.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: data.summary.map((s: { emoji: string; count: number }) => ({ ...s, mine: s.emoji === emoji ? data.action === "added" : m.reactions?.find((rx) => rx.emoji === s.emoji)?.mine })) }
              : m
          )
        );
      }
    } catch {
      /* ignore */
    }
  };

  const confirmDeleteMessage = async (scope: "me" | "everyone") => {
    if (!activeId || !pendingDelete) return;
    const { messageId } = pendingDelete;
    setPendingDelete(null);
    const r = await apiFetch(
      `/api/chat/conversations/${activeId}/messages/${messageId}?scope=${scope}`,
      { method: "DELETE" }
    );
    if (!r.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    if (scope === "me") {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
      void loadConversations();
    }
  };

  const toggleMessagePin = async (msg: ChatMessageItem) => {
    if (!activeId) return;
    const pinned = !msg.pinned;
    const r = await apiFetch("/api/chat/message-pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, messageId: msg.id, pinned }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setActionError((d as { error?: string }).error || ui.chatPinLimit);
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, pinned } : m)));
    if (pinned) {
      setPinnedMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, { ...msg, pinned: true }]));
    } else {
      setPinnedMessages((prev) => prev.filter((m) => m.id !== msg.id));
    }
  };

  const scrollToMessage = (messageId: string, highlight = true) => {
    const el = document.getElementById(`chat-msg-${messageId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (highlight) {
      setHighlightMessageId(messageId);
      setTimeout(() => setHighlightMessageId(null), 2200);
    }
  };

  const copyMessage = async (msg: ChatMessageItem) => {
    const text = msg.displayText || msg.originalText || "";
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1800);
    }
  };

  const forwardMessage = async (msg: ChatMessageItem, toConversationId: string) => {
    const body = msg.displayText || msg.originalText || msg.mediaName || "";
    if (!body.trim()) return;
    setForwarding(true);
    try {
      const prefix = `↪ ${msg.sender.name}: `;
      const res = await apiFetch(`/api/chat/conversations/${toConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${prefix}${body}`.trim(), type: "text" }),
      });
      if (res.ok) {
        setForwardTarget(null);
        if (toConversationId === activeId) {
          const d = await res.json();
          if (d.message) {
            setMessages((prev) =>
              prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]
            );
          }
        }
      } else {
        setActionError(ui.chatActionFailed);
      }
    } finally {
      setForwarding(false);
    }
  };

  const startReply = (msg: ChatMessageItem) => {
    setReplyTarget(msg);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const startEdit = (msg: ChatMessageItem) => {
    if (msg.type !== "text" || msg.deleted) return;
    setEditingMessage(msg);
    setReplyTarget(null);
    setText(msg.originalText || msg.displayText || "");
    requestAnimationFrame(() => syncInputHeight());
    inputRef.current?.focus();
  };

  const cancelComposerMode = () => {
    setReplyTarget(null);
    setEditingMessage(null);
    if (activeId) {
      const saved = localStorage.getItem(`tcall:draft:${activeId}`);
      setText(saved || "");
    } else {
      setText("");
    }
    requestAnimationFrame(() => syncInputHeight());
  };

  const saveEdit = async () => {
    if (!activeId || !editingMessage || !text.trim()) return;
    setSending(true);
    try {
      const r = await apiFetch(
        `/api/chat/conversations/${activeId}/messages/${editingMessage.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        }
      );
      const d = await r.json();
      if (r.ok && d.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === editingMessage.id ? { ...m, ...d.message } : m))
        );
        setPinnedMessages((prev) =>
          prev.map((m) => (m.id === editingMessage.id ? { ...m, ...d.message } : m))
        );
        cancelComposerMode();
        void loadConversations();
      } else {
        setActionError((d as { error?: string }).error || ui.chatActionFailed);
      }
    } finally {
      setSending(false);
    }
  };

  const openMediaGallery = useCallback((msg: ChatMessageItem) => {
    type GalleryEntry = ChatViewerItem & { id: string };
    const gallery: GalleryEntry[] = [];

    for (const m of messages) {
      if (m.deleted || !m.mediaUrl) continue;
      const src = resolveChatMediaUrl(m.mediaUrl);
      if (!src) continue;
      if (isChatImageMessage(m.type, m.mediaMime, m.mediaName)) {
        gallery.push({ id: m.id, src, type: "image", name: m.mediaName || undefined });
      } else if (isChatVideoMessage(m.type, m.mediaMime, m.mediaName)) {
        gallery.push({ id: m.id, src, type: "video", name: m.mediaName || undefined });
      }
    }

    const idx = Math.max(0, gallery.findIndex((g) => g.id === msg.id));
    setMediaViewer({ items: gallery.map(({ id: _id, ...rest }) => rest), index: idx });
  }, [messages]);

  const sendText = async () => {
    if (!activeId || !text.trim() || sending) return;
    if (editingMessage) {
      await saveEdit();
      return;
    }
    setSending(true);
    try {
      const payload: Record<string, string> = { text: text.trim(), type: "text" };
      if (replyTarget) payload.replyToId = replyTarget.id;
      const res = await apiFetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) {
        setText("");
        setReplyTarget(null);
        setShowEmoji(false);
        setShowAttachMenu(false);
        localStorage.removeItem(`tcall:draft:${activeId}`);
        stopTyping();
        requestAnimationFrame(() => syncInputHeight());
        if (d.message) {
          setMessages((prev) =>
            prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]
          );
        } else {
          await openConversation(activeId);
        }
        void loadConversations();
      } else {
        const msg =
          handleSubscriptionRequirement(res.status, d, "chat-send-text") ||
          (d as { error?: string }).error ||
          ui.chatActionFailed;
        setActionError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file: File) => {
    if (!activeId || uploading) return;
    setUploadError("");

    const allowedTypes = ["image/", "video/", "audio/", "application/pdf", "application/zip", "text/"];
    const isAllowed = allowedTypes.some((t) => file.type.startsWith(t));
    if (!isAllowed && !file.type) {
      // type bo'lmasa ham o'tkazamiz — brauzer aniqlay olmagan bo'lishi mumkin
    } else if (!isAllowed) {
      setUploadError("Ushbu fayl turi qo'llab-quvvatlanmaydi");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Fayl hajmi 50MB dan oshmasligi kerak");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await apiFetch("/api/chat/upload", { method: "POST", body: fd });
      let media: { url?: string; mime?: string; name?: string; size?: number; type?: string; error?: string };
      try {
        media = await up.json();
      } catch {
        setUploadError(ui.chatUploadFailed);
        return;
      }
      if (!up.ok) {
        setUploadError(media.error || ui.chatUploadFailed);
        return;
      }
      if (!media.url || !media.type) {
        setUploadError(ui.chatUploadFailed);
        return;
      }
      const msgRes = await apiFetch(`/api/chat/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: media.type,
          mediaUrl: media.url,
          mediaMime: media.mime,
          mediaName: media.name,
          mediaSize: media.size,
          text: text.trim() || undefined,
          ...(replyTarget ? { replyToId: replyTarget.id } : {}),
        }),
      });
      if (!msgRes.ok) {
        const err = await msgRes.json().catch(() => ({}));
        const msg =
          handleSubscriptionRequirement(msgRes.status, err, "chat-send-media") ||
          (err as { error?: string }).error ||
          ui.chatUploadFailed;
        setUploadError(msg);
        return;
      }
      const sent = await msgRes.json();
      setText("");
      setReplyTarget(null);
      if (sent.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === sent.message.id) ? prev : [...prev, sent.message]
        );
      } else {
        await openConversation(activeId);
      }
      void loadConversations();
    } catch {
      setUploadError(ui.chatUploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const createGroup = async () => {
    const ids = groupMembers
      .split(/[\s,;]+/)
      .map((s) => s.replace(/\D/g, ""))
      .filter((s) => s.length === 9);
    if (!groupName.trim()) {
      setActionError(ui.chatGroupNameRequired);
      return;
    }
    if (ids.length === 0) {
      setActionError(ui.chatMembersRequired);
      return;
    }
    setActionError("");
    const r = await apiFetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "group", name: groupName, memberTcallIds: ids }),
    });
    const d = await r.json();
    if (!r.ok) {
      const msg =
        handleSubscriptionRequirement(r.status, d, "chat-create-group") ||
        (d as { error?: string }).error ||
        ui.chatActionFailed;
      setActionError(msg);
      return;
    }
    setShowNewGroup(false);
    setGroupName("");
    setGroupMembers("");
    await loadConversations();
    await openConversation(d.conversationId);
  };

  const removeMember = async (targetUserId: string) => {
    if (!activeId) return;
    setActionError("");
    const r = await apiFetch(`/api/chat/conversations/${activeId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId }),
    });
    if (!r.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    if (targetUserId === userId) {
      closeThread();
      await loadConversations();
      return;
    }
    await loadConversations();
  };

  const changeMemberRole = async (targetUserId: string, role: "admin" | "member" | "owner") => {
    if (!activeId) return;
    setActionError("");
    const r = await apiFetch(`/api/chat/conversations/${activeId}/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId, role }),
    });
    if (!r.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    await loadConversations();
  };

  const renameGroup = async () => {
    if (!activeId || !editGroupName.trim()) return;
    setActionError("");
    const r = await apiFetch(`/api/chat/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editGroupName.trim() }),
    });
    if (!r.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    setShowRenameGroup(false);
    await loadConversations();
  };

  const uploadGroupAvatar = async (file: File) => {
    if (!activeId) return;
    setGroupAvatarUploading(true);
    setActionError("");
    try {
      const prepared = await prepareAvatarFile(file);
      const fd = new FormData();
      fd.append("file", prepared);
      const r = await apiFetch(`/api/chat/conversations/${activeId}/avatar`, { method: "POST", body: fd });
      if (!r.ok) throw new Error();
      await loadConversations();
    } catch {
      setActionError(ui.chatActionFailed);
    } finally {
      setGroupAvatarUploading(false);
    }
  };

  const beginVoiceRecord = async () => {
    if (!activeId || uploading || sending || voiceSessionRef.current) return;
    if (activeCall) {
      setUploadError(ui.chatVoiceBlocked);
      return;
    }
    try {
      const session = await startVoiceRecord();
      voiceSessionRef.current = session;
      voiceRecordStartedRef.current = Date.now();
      setVoiceDuration(0);
      setRecordingVoice(true);
      setUploadError("");
      // Timer
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration(Math.floor((Date.now() - voiceRecordStartedRef.current) / 1000));
      }, 500);
    } catch {
      setUploadError(ui.chatMicDenied);
    }
  };

  const cancelVoiceRecord = () => {
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
    const session = voiceSessionRef.current;
    voiceSessionRef.current = null;
    setRecordingVoice(false);
    setVoiceDuration(0);
    if (session) {
      try { session.recorder.stop(); } catch { /* ignore */ }
      session.stream.getTracks().forEach(t => t.stop());
    }
  };

  const finishVoiceRecord = async () => {
    if (voiceTimerRef.current) { clearInterval(voiceTimerRef.current); voiceTimerRef.current = null; }
    const session = voiceSessionRef.current;
    voiceSessionRef.current = null;
    setRecordingVoice(false);
    setVoiceDuration(0);
    if (!session) return;
    const elapsed = Date.now() - voiceRecordStartedRef.current;
    try {
      const file = await stopVoiceRecord(session);
      if (file && file.size > 400 && elapsed > 400) {
        await uploadAndSend(file);
      }
    } catch {
      setUploadError(ui.chatUploadFailed);
    }
  };

  const leaveChat = async (purgeGroup = false) => {
    if (!activeId) return;
    setActionError("");
    const r = await apiFetch(`/api/chat/conversations/${activeId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purgeGroup }),
    });
    if (!r.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    closeThread();
    await loadConversations();
  };

  const addMembersToGroup = async () => {
    if (!activeId) return;
    const ids = addMemberIds
      .split(/[\s,;]+/)
      .map((s) => s.replace(/\D/g, ""))
      .filter((s) => s.length === 9);
    if (ids.length === 0) {
      setActionError(ui.chatMembersRequired);
      return;
    }
    setActionError("");
    const r = await apiFetch(`/api/chat/conversations/${activeId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberTcallIds: ids }),
    });
    if (!r.ok) {
      setActionError(ui.chatActionFailed);
      return;
    }
    const d = await r.json();
    if (d.added === 0) {
      setActionError(ui.chatNoMembersFound);
      return;
    }
    setShowAddMembers(false);
    setAddMemberIds("");
    setShowManage(false);
    await loadConversations();
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
    const isGroup = activeConv.type === "group";
    const isGroupCreator = activeConv.createdById === userId;
    const myMember = activeConv.members.find((m) => m.userId === userId);
    const myRole = myMember?.role || (isGroupCreator ? "owner" : "member");
    const canManageGroup = myRole === "owner" || myRole === "admin";
    const peerIsOnline = !isGroup && (peerPresence?.online ?? activeConv.peerOnline ?? false);
    const peerStatusText =
      !isGroup && partner
        ? peerTyping && peerDraft.trim()
          ? peerDraft.trim()
          : peerTyping
          ? ui.chatTyping.replace("{name}", partner.name)
          : peerStatusLabel(
              peerIsOnline,
              peerPresence?.lastSeenAt ?? activeConv.peerLastSeenAt ?? null,
              ui
            )
        : null;

    const canModerateMessages = isGroup && (canManageGroup || isGroupCreator);
    const canDeleteForEveryone = (msg: ChatMessageItem) =>
      !isGroup || canModerateMessages || msg.sender.id === userId;

    return (
      <div className="chat-app chat-app-thread">
        <div className="chat-thread">
        <div className="chat-thread-header" ref={threadHeaderRef}>
          <button type="button" onClick={closeThread} className="ios-icon-btn shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="chat-thread-avatar-btn touch-manipulation shrink-0"
            onClick={() => {
              if (isGroup) void refreshAndOpenMembers();
              else if (partner?.tcallId) setShowPartnerProfile(true);
            }}
          >
            {isGroup ? (
              <GroupAvatar
                conversationId={activeConv.id}
                title={activeConv.title}
                avatar={activeConv.avatar}
                size="md"
                isGroup
              />
            ) : partner ? (
              <div className="chat-avatar-wrap">
                <UserAvatar
                  userId={partner.userId}
                  name={partner.name}
                  avatar={partner.avatar}
                  size="md"
                />
                {peerIsOnline && <span className="chat-online-dot" aria-hidden />}
              </div>
            ) : (
              <div className="chat-thread-avatar">{activeConv.title.slice(0, 2).toUpperCase()}</div>
            )}
          </button>
          <div className="flex-1 min-w-0 text-left min-w-0">
            {isGroup ? (
              <>
                <p className="chat-thread-title">{activeConv.title}</p>
                <button
                  type="button"
                  className="text-xs text-slate-500 mt-0.5 hover:text-brand-600 touch-manipulation"
                  onClick={() => void refreshAndOpenMembers()}
                >
                  {activeConv.members.length} {ui.chatMembers} · {ui.chatViewMembers}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="w-full text-left touch-manipulation"
                onClick={() => partner?.tcallId && setShowPartnerProfile(true)}
              >
                <p className="chat-thread-title">{activeConv.title}</p>
                {peerStatusText && (
                  <p
                    className={`chat-peer-status ${
                      peerIsOnline && !peerTyping ? "chat-peer-status-online" : ""
                    } ${peerTyping ? "chat-peer-status-typing" : ""}`}
                  >
                    {peerStatusText}
                  </p>
                )}
                {partner?.language && partner.language !== userLanguage && (
                  <p className="text-[10px] text-brand-600 mt-0.5">
                    {getLanguage(partner.language).flag} {ui.chatTranslationAuto}
                  </p>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className={`chat-thread-search-btn${threadSearchOpen ? " chat-thread-search-btn-active" : ""}`}
              aria-label={ui.chatSearchInThread}
              onClick={() => {
                setThreadSearchOpen((v) => !v);
                setThreadSearchQuery("");
                setThreadSearchResults([]);
              }}
            >
              <Search className="w-5 h-5" />
            </button>
            {!isGroup && partner?.tcallId && (
              <button type="button" onClick={() => void dial(partner.tcallId!)} className="chat-thread-call-btn">
                <Phone className="w-5 h-5 text-green-600" />
              </button>
            )}
            <button
              type="button"
              ref={chatManageBtnRef}
              className="chat-manage-btn"
              aria-label={isGroup ? ui.chatGroupSettings : ui.chatSettings}
              aria-haspopup="menu"
              aria-expanded={showManage}
              onClick={() => setShowManage(true)}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {actionError && <div className="chat-upload-error mx-5 mt-2">{actionError}</div>}

        {threadSearchOpen && (
          <div className="chat-thread-search">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="search"
              className="chat-thread-search-input"
              placeholder={ui.chatSearchInThread}
              value={threadSearchQuery}
              onChange={(e) => setThreadSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="chat-thread-search-close"
              onClick={() => {
                setThreadSearchOpen(false);
                setThreadSearchQuery("");
                setThreadSearchResults([]);
              }}
              aria-label={ui.chatCancelEdit}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {threadSearchOpen && threadSearchQuery.trim().length >= 2 && (
          <div className="chat-thread-search-results">
            {threadSearchLoading ? (
              <p className="chat-thread-search-hint">{ui.chatSearchPlaceholder}</p>
            ) : threadSearchResults.length === 0 ? (
              <p className="chat-thread-search-hint">{ui.chatSearchNoResults}</p>
            ) : (
              threadSearchResults.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  className="chat-thread-search-hit"
                  onClick={() => {
                    scrollToMessage(hit.id);
                    setThreadSearchOpen(false);
                    setThreadSearchQuery("");
                    setThreadSearchResults([]);
                  }}
                >
                  {(hit.text || "").slice(0, 120)}
                </button>
              ))
            )}
          </div>
        )}

        {pinnedMessages.length > 0 && (
          <div className="chat-pinned-bar">
            <Pin className="w-4 h-4 text-brand-600 shrink-0" aria-hidden />
            <div className="chat-pinned-list">
              {pinnedMessages.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  className="chat-pinned-item"
                  onClick={() => scrollToMessage(pm.id)}
                >
                  <span className="chat-pinned-author">{pm.sender.name}</span>
                  <span className="chat-pinned-preview">
                    {pm.deleted ? ui.chatMessageDeleted : (pm.displayText || pm.mediaName || "…").slice(0, 80)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className="chat-messages-wrap"
          ref={messagesWrapRef}
          onPointerDown={handleMessagesPointerDown}
        >
        <div className="chat-messages" ref={messagesRef} onScroll={handleMessagesScroll}>
          {loadingOlder && (
            <div className="chat-load-older">
              <TcallLogo size="xs" animate />
            </div>
          )}
          {loadingMsgs ? (
            <div className="chat-loading-inline"><TcallLogo size="xs" animate /></div>
          ) : messages.length === 0 ? (
            <p className="chat-empty-hint">{ui.chatEmptyThread}</p>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDate = !prev || !sameChatDay(prev.createdAt, m.createdAt);
              const showUnreadDivider = m.id === firstUnreadId;
              return (
                <Fragment key={m.id}>
                  {showDate && (
                    <div className="chat-date-separator">
                      {formatChatDateLabel(m.createdAt, userLanguage)}
                    </div>
                  )}
                  {showUnreadDivider && (
                    <div className="chat-unread-divider">
                      <span>{ui.chatUnreadDivider}</span>
                    </div>
                  )}
                  <MessageBubble
                    msg={m}
                    isMine={m.sender.id === userId}
                    ui={ui}
                    highlighted={highlightMessageId === m.id}
                    onDelete={
                      !m.deleted
                        ? () => deleteMessage(m, canDeleteForEveryone(m), !isGroup)
                        : undefined
                    }
                    onReply={!m.deleted ? () => startReply(m) : undefined}
                    onEdit={
                      m.sender.id === userId && !m.deleted && m.type === "text"
                        ? () => startEdit(m)
                        : undefined
                    }
                    onPin={!m.deleted ? () => void toggleMessagePin(m) : undefined}
                    onCopy={
                      !m.deleted && (m.displayText || m.originalText)
                        ? () => void copyMessage(m)
                        : undefined
                    }
                    onForward={
                      !m.deleted && (m.displayText || m.originalText || m.mediaName)
                        ? () => setForwardTarget(m)
                        : undefined
                    }
                    onReact={!m.deleted ? (emoji) => void handleReaction(m.id, emoji) : undefined}
                    onOpenMedia={() => openMediaGallery(m)}
                    onQuoteClick={m.replyTo ? () => scrollToMessage(m.replyTo!.id) : undefined}
                  />
                </Fragment>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        {showScrollDown && (
          <button type="button" className="chat-scroll-down-btn" onClick={scrollToBottom}>
            <ArrowDown className="w-4 h-4" />
            <span>{ui.chatNewMessages}</span>
          </button>
        )}
        {firstUnreadId && showScrollDown && (
          <button
            type="button"
            className="chat-jump-unread-btn"
            onClick={() => scrollToMessage(firstUnreadId)}
          >
            {ui.chatJumpToUnread}
          </button>
        )}
        </div>

        <div className="chat-composer">
          {replyTarget && !editingMessage && (
            <div className="chat-reply-bar">
              <div className="chat-reply-bar-accent" />
              <div className="chat-reply-bar-body">
                <span className="chat-reply-bar-label">{ui.chatReplyTo} {replyTarget.sender.name}</span>
                <span className="chat-reply-bar-text">
                  {(replyTarget.displayText || replyTarget.mediaName || "").slice(0, 120)}
                </span>
              </div>
              <button type="button" className="chat-reply-bar-close" onClick={cancelComposerMode} aria-label={ui.chatCancelEdit}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {editingMessage && (
            <div className="chat-reply-bar chat-edit-bar">
              <div className="chat-reply-bar-accent chat-edit-bar-accent" />
              <div className="chat-reply-bar-body">
                <span className="chat-reply-bar-label">{ui.chatEditing}</span>
                <span className="chat-reply-bar-text">{(editingMessage.displayText || "").slice(0, 120)}</span>
              </div>
              <button type="button" className="chat-reply-bar-close" onClick={cancelComposerMode} aria-label={ui.chatCancelEdit}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {uploadError && <div className="chat-upload-error">{uploadError}</div>}
          {uploading && <div className="chat-upload-status">{ui.chatUploading}</div>}
          {recordingVoice && (
            <div className="voice-recording-bar">
              <span className="voice-rec-dot" aria-hidden />
              <span className="voice-rec-time">
                {Math.floor(voiceDuration / 60)}:{(voiceDuration % 60).toString().padStart(2, "0")}
              </span>
              <span className="voice-rec-hint">↑ Qo'yib yuborish — yuborish</span>
              <button type="button" className="voice-rec-cancel" onClick={cancelVoiceRecord} aria-label="Bekor qilish">
                ✕
              </button>
            </div>
          )}
          {showEmoji && (
            <div className="chat-emoji-panel">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="chat-emoji-btn"
                  onClick={() => {
                    setText((t) => t + e);
                    inputRef.current?.focus();
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="chat-composer-bar">
            <div className="chat-composer-attach-wrap" ref={attachWrapRef}>
              <button
                type="button"
                className="chat-composer-circle-btn"
                aria-label={ui.chatAttach}
                disabled={uploading}
                onClick={() => setShowAttachMenu((v) => !v)}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              {showAttachMenu && (
                <div className="chat-attach-menu">
                  <button
                    type="button"
                    className="chat-attach-menu-item"
                    onClick={() => {
                      setShowAttachMenu(false);
                      mediaRef.current?.click();
                    }}
                  >
                    <ImagePlus className="w-5 h-5 text-brand-600" />
                    <span>{ui.chatPhoto}</span>
                  </button>
                  <button
                    type="button"
                    className="chat-attach-menu-item"
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileRef.current?.click();
                    }}
                  >
                    <Paperclip className="w-5 h-5 text-slate-600" />
                    <span>{ui.chatFile}</span>
                  </button>
                </div>
              )}
            </div>
            <input
              ref={mediaRef}
              type="file"
              accept="image/*,video/*,.heic,.heif,.HEIC,.HEIF"
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
            <div className="chat-composer-field">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder={editingMessage ? ui.chatEditMessage : ui.typeMessage}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  syncInputHeight();
                  if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
                  typingEmitRef.current = setTimeout(() => emitTyping(), 400);
                }}
                onBlur={() => stopTyping()}
                rows={1}
                maxLength={2000}
                enterKeyHint="send"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendText();
                  }
                }}
              />
              <button
                type="button"
                className={`chat-composer-emoji-btn ${showEmoji ? "chat-composer-emoji-btn-active" : ""}`}
                aria-label="Emoji"
                onClick={() => {
                  setShowEmoji((v) => !v);
                  setShowAttachMenu(false);
                }}
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>
            {text.trim() ? (
              <button
                type="button"
                className="chat-composer-send-btn"
                disabled={sending || uploading}
                aria-label={ui.typeMessage}
                onClick={() => void sendText()}
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                className={`chat-composer-mic-btn ${recordingVoice ? "chat-composer-mic-recording" : ""}`}
                aria-label={ui.chatVoiceHint}
                disabled={uploading || sending || !!activeCall}
                title={activeCall ? ui.chatVoiceBlocked : undefined}
                onPointerDown={(e) => {
                  e.preventDefault();
                  void beginVoiceRecord();
                }}
                onPointerUp={() => void finishVoiceRecord()}
                onPointerLeave={() => {
                  if (recordingVoice) void finishVoiceRecord();
                }}
                onPointerCancel={() => void finishVoiceRecord()}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        </div>

        {showManage && activeConv && (
          <ChatThreadMenuSheet
            ui={ui}
            anchorRef={chatManageBtnRef}
            isGroup={isGroup}
            canManageGroup={canManageGroup}
            isOwner={myRole === "owner"}
            isPinned={!!activeConv.pinnedAt}
            onClose={() => setShowManage(false)}
            onViewMembers={() => void refreshAndOpenMembers()}
            onAddMembers={() => setShowAddMembers(true)}
            onRenameGroup={() => {
              setEditGroupName(activeConv.title);
              setShowRenameGroup(true);
            }}
            onTogglePin={() => void togglePin(activeConv.id, !activeConv.pinnedAt)}
            onReport={() => setShowReportChat(true)}
            onLeave={() => {
              if (typeof window !== "undefined" && window.confirm(isGroup ? ui.chatConfirmLeave : ui.chatConfirmDeleteChat)) {
                void leaveChat(false);
              }
            }}
            onDeleteGroup={() => {
              if (typeof window !== "undefined" && window.confirm(ui.chatConfirmDeleteGroup)) void leaveChat(true);
            }}
            onViewProfile={
              !isGroup && partner?.tcallId ? () => setShowPartnerProfile(true) : undefined
            }
          />
        )}

        {showReportChat && activeId && (
          <ReportModal
            ui={ui}
            type="chat"
            targetId={activeId}
            targetLabel={activeConv?.title}
            onClose={() => setShowReportChat(false)}
          />
        )}

        {!isGroup && partner?.tcallId && showPartnerProfile && (
          <UserProfileModal
            tcallId={partner.tcallId}
            ui={ui}
            onClose={() => setShowPartnerProfile(false)}
            onOpenChat={() => {
              dismissKeyboard();
              setShowPartnerProfile(false);
            }}
          />
        )}

        {showAddMembers && (
          <div className="ios-modal-overlay" onClick={() => setShowAddMembers(false)}>
            <div className="ios-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{ui.chatAddMembers}</h3>
                <button type="button" onClick={() => setShowAddMembers(false)} className="ios-icon-btn"><X className="w-5 h-5" /></button>
              </div>
              <textarea
                className="input-field-compact min-h-[72px] mb-3 font-mono text-sm"
                placeholder={ui.groupMembersHint}
                value={addMemberIds}
                onChange={(e) => setAddMemberIds(e.target.value)}
              />
              {actionError && <div className="ios-error-banner mb-3">{actionError}</div>}
              <button type="button" className="btn-primary btn-compact w-full" onClick={() => void addMembersToGroup()}>
                {ui.chatAddMembers}
              </button>
            </div>
          </div>
        )}

        {showMembers && isGroup && (
          <ChatGroupMembersPanel
            ui={ui}
            members={activeConv.members}
            myUserId={userId}
            myRole={myRole}
            onClose={() => setShowMembers(false)}
            onRemove={(id) => void removeMember(id)}
            onSetRole={(id, role) => void changeMemberRole(id, role)}
          />
        )}

        {showRenameGroup && (
          <div className="ios-modal-overlay" onClick={() => setShowRenameGroup(false)}>
            <div className="ios-modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">{ui.chatRenameGroup}</h3>
                <button type="button" onClick={() => setShowRenameGroup(false)} className="ios-icon-btn"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex flex-col items-center gap-3 mb-4">
                <GroupAvatar
                  conversationId={activeConv.id}
                  title={activeConv.title}
                  avatar={activeConv.avatar}
                  size="xl"
                  isGroup
                />
                <input
                  ref={groupAvatarRef}
                  type="file"
                  accept="image/*,.heic,.heif,.HEIC,.HEIF"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadGroupAvatar(f);
                    e.target.value = "";
                  }}
                />
                {canManageGroup && (
                  <button
                    type="button"
                    className="btn-secondary btn-compact text-xs"
                    disabled={groupAvatarUploading}
                    onClick={() => groupAvatarRef.current?.click()}
                  >
                    {groupAvatarUploading ? ui.photoUploading : ui.changeGroupPhoto}
                  </button>
                )}
              </div>
              <input
                className="input-field-compact mb-3"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
              />
              <button type="button" className="btn-primary btn-compact w-full" onClick={() => void renameGroup()}>
                {ui.chatSave}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="chat-app chat-app-list">
      <div className="chat-list-view">
      <div className="app-page-title">
        <span className="app-page-title-dot" aria-hidden />
        <h2>{ui.messages}</h2>
      </div>
      <div className="chat-list-actions">
        <button type="button" className="chat-action-btn chat-action-btn-primary" onClick={() => { setActionError(""); setShowNewChat(true); }}>
          <Plus className="w-4 h-4" /> {ui.newChat}
        </button>
        <button type="button" className="chat-action-btn chat-action-btn-secondary" onClick={() => { setActionError(""); setShowNewGroup(true); }}>
          <Users className="w-4 h-4" /> {ui.newGroup}
        </button>
      </div>

      {actionError && (
        <div className="ios-error-banner mb-3">{actionError}</div>
      )}

      <div className="chat-list-search">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="search"
          className="chat-list-search-input"
          placeholder={messageSearchMode ? ui.chatSearchPlaceholder : ui.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          type="button"
          className={`chat-search-mode-btn${messageSearchMode ? " chat-search-mode-btn-active" : ""}`}
          onClick={() => {
            setMessageSearchMode((v) => !v);
            setSearchQuery("");
            setMessageSearchResults([]);
          }}
          title={ui.chatSearch}
        >
          {ui.chatSearch}
        </button>
      </div>

      {loading ? (
        <ChatConvSkeleton />
      ) : messageSearchMode ? (
        messageSearchLoading ? (
          <ChatConvSkeleton count={4} />
        ) : messageSearchResults.length === 0 ? (
          <div className="ios-empty-state">
            <p>{searchQuery.trim().length < 2 ? ui.chatSearchPlaceholder : ui.chatSearchNoResults}</p>
          </div>
        ) : (
          <ul className="chat-conv-list">
            {messageSearchResults.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="chat-conv-item"
                  onClick={() => void openConversation(hit.conversationId, { scrollToMessageId: hit.id })}
                >
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold truncate">{hit.conversationName || ui.messages}</p>
                    <p className="text-sm text-slate-500 truncate">{hit.text}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : conversations.length === 0 ? (
        <div className="ios-empty-state">
          <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
          <p>{ui.noMessages}</p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs text-center">{ui.chatHint}</p>
        </div>
      ) : (
        <ul className="chat-conv-list">
          {conversations
            .filter((c) => {
              const q = searchQuery.trim().toLowerCase();
              if (!q) return true;
              const preview = (c.lastPreview || c.lastMessage?.displayText || "").toLowerCase();
              return c.title.toLowerCase().includes(q) || preview.includes(q);
            })
            .map((c) => (
            <li key={c.id}>
              <button type="button" className="chat-conv-item" onClick={() => void openConversation(c.id)}>
                {c.pinnedAt && <Pin className="w-3 h-3 text-brand-500 shrink-0 absolute left-1 top-1" aria-hidden />}
                {c.type === "group" ? (
                  <GroupAvatar
                    conversationId={c.id}
                    title={c.title}
                    avatar={c.avatar}
                    size="md"
                    isGroup
                  />
                ) : (
                  (() => {
                    const p = c.members.find((m) => m.userId !== userId);
                    return p ? (
                      <div className="chat-avatar-wrap">
                        <UserAvatar userId={p.userId} name={p.name} avatar={p.avatar} size="md" />
                        {c.peerOnline && <span className="chat-online-dot" aria-hidden />}
                      </div>
                    ) : (
                      <div className="chat-conv-avatar">{c.title.slice(0, 2).toUpperCase()}</div>
                    );
                  })()
                )}
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
                    {c.lastPreview ||
                      c.lastMessage?.displayText ||
                      c.lastMessage?.originalText ||
                      "..."}
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
            {actionError && <div className="ios-error-banner mb-3">{actionError}</div>}
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
            {actionError && <div className="ios-error-banner mb-3">{actionError}</div>}
            <button type="button" className="btn-primary btn-compact w-full" onClick={() => void createGroup()}>
              {ui.createGroup}
            </button>
          </div>
        </div>
      )}
      </div>

      {mediaViewer && (
        <ChatMediaViewer
          items={mediaViewer.items}
          index={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
          onIndexChange={(index) => setMediaViewer((v) => (v ? { ...v, index } : null))}
        />
      )}

      {pendingDelete && (
        <div className="ios-modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="ios-modal-panel max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-center mb-1">{ui.chatDeleteMessage}</p>
            <p className="text-sm text-slate-500 text-center mb-4">{ui.chatConfirmDeleteMessage}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-compact w-full bg-red-500 text-white rounded-xl font-semibold"
                onClick={() => void confirmDeleteMessage("me")}
              >
                {ui.chatDeleteForMe}
              </button>
              {pendingDelete.canDeleteForEveryone && (
                <button
                  type="button"
                  className="btn-compact w-full bg-red-600 text-white rounded-xl font-semibold"
                  onClick={() => void confirmDeleteMessage("everyone")}
                >
                  {pendingDelete.isDirect ? ui.chatDeleteForBoth : ui.chatDeleteForEveryone}
                </button>
              )}
              <button
                type="button"
                className="btn-secondary btn-compact w-full"
                onClick={() => setPendingDelete(null)}
              >
                {ui.logoutCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {forwardTarget && (
        <div className="ios-modal-overlay" onClick={() => setForwardTarget(null)}>
          <div className="ios-modal-panel max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{ui.chatForwardTo}</h3>
              <button type="button" onClick={() => setForwardTarget(null)} className="ios-icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-3 truncate">
              {(forwardTarget.displayText || forwardTarget.originalText || forwardTarget.mediaName || "").slice(0, 80)}
            </p>
            <ul className="chat-forward-list max-h-64 overflow-y-auto">
              {conversations
                .filter((c) => c.id !== activeId)
                .map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="chat-forward-item"
                      disabled={forwarding}
                      onClick={() => void forwardMessage(forwardTarget, c.id)}
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      {copyToast && (
        <div className="chat-copy-toast" role="status">
          {ui.chatCopied}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  ui,
  highlighted,
  onDelete,
  onReply,
  onEdit,
  onPin,
  onCopy,
  onForward,
  onReact,
  onOpenMedia,
  onQuoteClick,
}: {
  msg: ChatMessageItem;
  isMine: boolean;
  ui: Record<string, string>;
  highlighted?: boolean;
  onDelete?: () => void;
  onReply?: () => void;
  onEdit?: () => void;
  onPin?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onReact?: (emoji: string) => void;
  onOpenMedia?: () => void;
  onQuoteClick?: () => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [mediaBroken, setMediaBroken] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const body = msg.deleted ? msg.displayText : showOriginal ? msg.originalText : msg.displayText;
  const mediaSrc = resolveChatMediaUrl(msg.mediaUrl);
  const isImage = !msg.deleted && isChatImageMessage(msg.type, msg.mediaMime, msg.mediaName);
  const isVideo = !msg.deleted && isChatVideoMessage(msg.type, msg.mediaMime, msg.mediaName);
  const isAudio = !msg.deleted && isChatAudioMessage(msg.type, msg.mediaMime, msg.mediaName);
  const sourceLang = msg.sourceLang ? getLanguage(msg.sourceLang) : null;
  const bubbleClass = isAudio
    ? `chat-bubble chat-bubble-voice ${isMine ? "chat-bubble-bg-mine" : "chat-bubble-bg-theirs"}`
    : `chat-bubble ${isMine ? "chat-bubble-bg-mine" : "chat-bubble-bg-theirs"}`;
  const hasActions = Boolean(onDelete || onReply || onEdit || onPin || onReact || onCopy || onForward);

  const openActions = () => {
    if (hasActions) setShowActions(true);
  };

  return (
    <div
      id={`chat-msg-${msg.id}`}
      className={`chat-bubble-wrap ${isMine ? "chat-bubble-mine" : "chat-bubble-theirs"} ${
        msg.deleted ? "chat-bubble-deleted" : ""
      } ${isAudio ? "chat-bubble-wrap-voice" : ""} ${highlighted ? "chat-bubble-highlight" : ""}`}
      onContextMenu={(e) => {
        if (hasActions) {
          e.preventDefault();
          setShowActions((v) => !v);
        }
      }}
      onTouchStart={() => {
        longPressRef.current = setTimeout(openActions, 480);
      }}
      onTouchEnd={() => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
      }}
      onTouchMove={() => {
        if (longPressRef.current) clearTimeout(longPressRef.current);
      }}
    >
      {!isMine && msg.sender.name && (
        <p className="chat-bubble-sender">{msg.sender.name}</p>
      )}
      <div className={bubbleClass}>
        {msg.replyTo && !msg.deleted && (
          <button type="button" className="chat-reply-quote" onClick={onQuoteClick}>
            <span className="chat-reply-quote-name">{msg.replyTo.senderName}</span>
            <span className="chat-reply-quote-text">{msg.replyTo.preview}</span>
          </button>
        )}
        {msg.hasTranslation && sourceLang && !showOriginal && !msg.deleted && !isAudio && (
          <p className="chat-translation-badge">
            {sourceLang.flag} {ui.chatTranslatedFrom}
          </p>
        )}
        {isImage && mediaSrc && !mediaBroken && (
          <button
            type="button"
            className="chat-media-tap"
            onClick={() => onOpenMedia?.()}
          >
            <img
              src={mediaSrc}
              alt={msg.mediaName || ui.chatPhoto}
              className="chat-media-image"
              loading="lazy"
              onError={() => setMediaBroken(true)}
            />
          </button>
        )}
        {isImage && mediaSrc && mediaBroken && (
          <button type="button" className="chat-file-link" onClick={() => onOpenMedia?.()}>
            📷 {msg.mediaName || ui.chatOpenFile}
          </button>
        )}
        {isVideo && mediaSrc && (
          <button
            type="button"
            className="chat-media-tap chat-media-video-thumb"
            onClick={() => onOpenMedia?.()}
          >
            <video src={mediaSrc} className="chat-media-video" preload="metadata" playsInline muted />
            <span className="chat-video-play-icon" aria-hidden>
              <Play className="w-8 h-8 fill-white text-white" />
            </span>
          </button>
        )}
        {isAudio && mediaSrc && (
          <VoiceMessageBubble src={mediaSrc} isMine={isMine} />
        )}
        {msg.type === "file" && mediaSrc && !isImage && !isVideo && !isAudio && (
          <a href={mediaSrc} download={msg.mediaName || undefined} className="chat-file-link">
            📎 {msg.mediaName || ui.chatFile}
          </a>
        )}
        {body && (
          <p className={`chat-bubble-text whitespace-pre-wrap ${msg.deleted ? "chat-bubble-text-deleted" : ""}`}>
            {msg.deleted ? body : linkifyText(body)}
          </p>
        )}
        {msg.hasTranslation && msg.originalText && !msg.deleted && (
          <button
            type="button"
            className="chat-view-original"
            onClick={() => setShowOriginal((v) => !v)}
          >
            {showOriginal ? ui.viewTranslation : ui.viewOriginal}
          </button>
        )}
      </div>
      <div className={`chat-bubble-meta ${isMine ? "chat-bubble-meta-mine" : ""}`}>
        <span className="chat-bubble-time">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        {msg.edited && !msg.deleted && (
          <span className="chat-edited-label">{ui.chatEdited}</span>
        )}
        {msg.pinned && !msg.deleted && (
          <Pin className="w-3 h-3 text-brand-500 shrink-0" aria-label={ui.chatPinned} />
        )}
        {isMine && msg.readStatus && !msg.deleted && (
          <span
            className={`chat-msg-status ${msg.readStatus === "read" ? "chat-msg-status-read" : ""}`}
            aria-label={msg.readStatus === "read" ? ui.chatMessageRead : ui.chatMessageSent}
          >
            {msg.readStatus === "read" ? (
              <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.25} />
            ) : (
              <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
            )}
          </span>
        )}
        {hasActions && (
          <button
            type="button"
            className="chat-msg-delete-btn"
            aria-label={ui.chatManage}
            onClick={() => setShowActions((v) => !v)}
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}
      </div>
      {showActions && (
        <div className="chat-msg-actions">
          {onReact && !msg.deleted && (
            <div className="chat-reaction-bar">
              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="chat-reaction-emoji-btn"
                  onClick={() => { onReact(emoji); setShowActions(false); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {onReply && (
            <button type="button" className="chat-msg-action" onClick={() => { onReply(); setShowActions(false); }}>
              <CornerUpLeft className="w-3.5 h-3.5" />
              {ui.chatReply}
            </button>
          )}
          {onCopy && (
            <button type="button" className="chat-msg-action" onClick={() => { onCopy(); setShowActions(false); }}>
              <Copy className="w-3.5 h-3.5" />
              {ui.chatCopy}
            </button>
          )}
          {onForward && (
            <button type="button" className="chat-msg-action" onClick={() => { onForward(); setShowActions(false); }}>
              <Forward className="w-3.5 h-3.5" />
              {ui.chatForward}
            </button>
          )}
          {onEdit && (
            <button type="button" className="chat-msg-action" onClick={() => { onEdit(); setShowActions(false); }}>
              <Pencil className="w-3.5 h-3.5" />
              {ui.chatEditMessage}
            </button>
          )}
          {onPin && (
            <button type="button" className="chat-msg-action" onClick={() => { onPin(); setShowActions(false); }}>
              <Pin className="w-3.5 h-3.5" />
              {msg.pinned ? ui.chatUnpinMessage : ui.chatPinMessage}
            </button>
          )}
          {onDelete && (
            <button type="button" className="chat-msg-action-danger" onClick={() => { onDelete(); setShowActions(false); }}>
              <Trash2 className="w-3.5 h-3.5" />
              {ui.chatDeleteMessage}
            </button>
          )}
        </div>
      )}
      {msg.reactions && msg.reactions.length > 0 && (
        <div className={`chat-reactions ${isMine ? "chat-reactions-mine" : ""}`}>
          {msg.reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              className={`chat-reaction-pill${r.mine ? " chat-reaction-pill-mine" : ""}`}
              onClick={() => onReact?.(r.emoji)}
              title={r.emoji}
            >
              {r.emoji} <span className="chat-reaction-count">{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
