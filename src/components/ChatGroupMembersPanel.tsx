"use client";

import { Crown, Shield, UserMinus, X } from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";

export interface GroupMember {
  userId: string;
  name: string;
  tcallId: string | null;
  role?: string;
}

interface ChatGroupMembersPanelProps {
  ui: Record<string, string>;
  members: GroupMember[];
  myUserId: string;
  myRole: string;
  onClose: () => void;
  onRemove: (userId: string) => void;
  onSetRole: (userId: string, role: "admin" | "member" | "owner") => void;
}

function roleLabel(role: string | undefined, ui: Record<string, string>) {
  if (role === "owner") return ui.chatOwner;
  if (role === "admin") return ui.chatAdmin;
  return ui.chatMember;
}

export function ChatGroupMembersPanel({
  ui,
  members,
  myUserId,
  myRole,
  onClose,
  onRemove,
  onSetRole,
}: ChatGroupMembersPanelProps) {
  const isOwner = myRole === "owner";
  const isAdmin = myRole === "admin" || isOwner;

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel chat-members-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">{ui.chatViewMembers}</h3>
          <button type="button" onClick={onClose} className="ios-icon-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="chat-members-list">
          {members.map((m) => {
            const isMe = m.userId === myUserId;
            const role = m.role || "member";
            const canRemoveOther =
              isAdmin &&
              !isMe &&
              role !== "owner" &&
              (isOwner || role === "member");

            return (
              <li key={m.userId} className="chat-member-row">
                <div className="chat-member-avatar">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {m.name}
                    {isMe && " (siz)"}
                  </p>
                  {m.tcallId && (
                    <p className="text-xs text-slate-500 font-mono">{formatTcallId(m.tcallId)}</p>
                  )}
                </div>
                <span className={`chat-member-role chat-member-role-${role}`}>
                  {role === "owner" && <Crown className="w-3 h-3" />}
                  {role === "admin" && <Shield className="w-3 h-3" />}
                  {roleLabel(role, ui)}
                </span>
                <div className="chat-member-actions">
                  {isOwner && !isMe && role !== "owner" && (
                    <>
                      {role === "member" ? (
                        <button
                          type="button"
                          className="chat-member-action-btn"
                          onClick={() => {
                            if (window.confirm(ui.chatConfirmMakeAdmin)) onSetRole(m.userId, "admin");
                          }}
                        >
                          {ui.chatMakeAdmin}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="chat-member-action-btn"
                          onClick={() => onSetRole(m.userId, "member")}
                        >
                          {ui.chatRemoveAdmin}
                        </button>
                      )}
                      <button
                        type="button"
                        className="chat-member-action-btn"
                        onClick={() => {
                          if (window.confirm(ui.chatConfirmMakeOwner)) onSetRole(m.userId, "owner");
                        }}
                      >
                        {ui.chatMakeOwner}
                      </button>
                    </>
                  )}
                  {(canRemoveOther || (isMe && role !== "owner")) && (
                    <button
                      type="button"
                      className="chat-member-action-btn chat-member-action-danger"
                      onClick={() => {
                        if (window.confirm(ui.chatConfirmRemoveMember)) onRemove(m.userId);
                      }}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
