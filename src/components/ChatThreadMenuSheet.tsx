"use client";

import {
  LogOut,
  MessageSquare,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

interface ChatThreadMenuSheetProps {
  ui: Record<string, string>;
  isGroup: boolean;
  canManageGroup: boolean;
  isOwner: boolean;
  onClose: () => void;
  onViewMembers: () => void;
  onAddMembers: () => void;
  onRenameGroup: () => void;
  onLeave: () => void;
  onDeleteGroup: () => void;
}

export function ChatThreadMenuSheet({
  ui,
  isGroup,
  canManageGroup,
  isOwner,
  onClose,
  onViewMembers,
  onAddMembers,
  onRenameGroup,
  onLeave,
  onDeleteGroup,
}: ChatThreadMenuSheetProps) {
  const item = (label: string, icon: React.ReactNode, action: () => void, danger = false) => (
    <button
      type="button"
      className={`chat-menu-sheet-item ${danger ? "chat-menu-sheet-item-danger" : ""}`}
      onClick={() => {
        onClose();
        action();
      }}
    >
      <span className="chat-menu-sheet-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="ios-modal-overlay chat-menu-overlay" onClick={onClose}>
      <div className="ios-modal-panel chat-menu-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="chat-menu-sheet-handle" aria-hidden />
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">
            {isGroup ? ui.chatGroupSettings : ui.chatSettings}
          </h3>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="chat-menu-sheet-list">
          {isGroup && item(ui.chatViewMembers, <Users className="w-5 h-5" />, onViewMembers)}
          {isGroup && canManageGroup && item(ui.chatAddMembers, <UserPlus className="w-5 h-5" />, onAddMembers)}
          {isGroup && canManageGroup && item(ui.chatRenameGroup, <MessageSquare className="w-5 h-5" />, onRenameGroup)}
          {item(
            isGroup ? ui.chatLeaveGroup : ui.chatDeleteChat,
            <LogOut className="w-5 h-5" />,
            onLeave
          )}
          {isGroup && isOwner && item(
            ui.chatDeleteGroup,
            <Trash2 className="w-5 h-5" />,
            onDeleteGroup,
            true
          )}
        </div>
      </div>
    </div>
  );
}
