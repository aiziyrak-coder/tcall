"use client";

import {
  LogOut,
  MessageSquare,
  Trash2,
  UserPlus,
  Users,
  User,
  Pin,
  Flag,
} from "lucide-react";
import type { RefObject } from "react";
import { HeaderActionMenu } from "@/components/HeaderActionMenu";

interface ChatThreadMenuSheetProps {
  ui: Record<string, string>;
  isGroup: boolean;
  canManageGroup: boolean;
  isOwner: boolean;
  isPinned?: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onViewMembers: () => void;
  onAddMembers: () => void;
  onRenameGroup: () => void;
  onLeave: () => void;
  onDeleteGroup: () => void;
  onViewProfile?: () => void;
  onTogglePin?: () => void;
  onReport?: () => void;
}

export function ChatThreadMenuSheet({
  ui,
  isGroup,
  canManageGroup,
  isOwner,
  anchorRef,
  onClose,
  onViewMembers,
  onAddMembers,
  onRenameGroup,
  onLeave,
  onDeleteGroup,
  onViewProfile,
  onTogglePin,
  onReport,
  isPinned,
}: ChatThreadMenuSheetProps) {
  const item = (label: string, icon: React.ReactNode, action: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
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
    <HeaderActionMenu
      open
      anchorRef={anchorRef}
      onClose={onClose}
      ariaLabel={isGroup ? ui.chatGroupSettings : ui.chatSettings}
      panelClassName="header-menu-dropdown--chat"
    >
      <div className="chat-menu-sheet-list">
        {onTogglePin &&
          item(
            isPinned ? ui.chatUnpinConversation : ui.chatPinConversation,
            <Pin className="w-5 h-5" />,
            onTogglePin
          )}
        {!isGroup && onViewProfile && item(ui.viewProfile, <User className="w-5 h-5" />, onViewProfile)}
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
        {onReport && item(ui.reportUser, <Flag className="w-5 h-5" />, onReport, true)}
      </div>
    </HeaderActionMenu>
  );
}
