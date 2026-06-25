"use client";

import {
  Phone,
  MessageSquare,
  UserPlus,
  Shield,
  ShieldOff,
  HandHelping,
  Check,
  X,
  Clock,
  UserMinus,
} from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage } from "@/lib/languages";
import { getStatusLabel } from "@/lib/status";
import { UserAvatar } from "@/components/UserAvatar";
import { formatProfileAge, type UserProfileFields } from "@/lib/user-profile";

export type UserProfileData = UserProfileFields & {
  userId?: string;
  avatarUrl?: string | null;
};

interface UserProfileCardProps {
  ui: Record<string, string>;
  user: UserProfileData;
  onCall?: () => void;
  onMessage?: () => void;
  /** Yangi: do'stlik so'rovi yuborish */
  onSendFriendRequest?: () => void;
  /** Yangi: kelgan so'rovni qabul qilish */
  onAcceptFriendRequest?: () => void;
  /** Yangi: yuborilgan so'rovni bekor qilish */
  onCancelFriendRequest?: () => void;
  onRemoveFriend?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onRequestUnblock?: () => void;
  onAcceptUnblock?: () => void;
  onRejectUnblock?: () => void;
  onReport?: () => void;
  loading?: boolean;
  /** @deprecated — removed from card, kept for backward compat */
  onAddFriend?: () => void;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-detail-row">
      <span className="profile-detail-label">{label}</span>
      <span className="profile-detail-value">{value}</span>
    </div>
  );
}

export function UserProfileCard({
  ui,
  user,
  onCall,
  onMessage,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onCancelFriendRequest,
  onRemoveFriend,
  onBlock,
  onUnblock,
  onRequestUnblock,
  onAcceptUnblock,
  onRejectUnblock,
  onReport,
  loading,
}: UserProfileCardProps) {
  const lang = user.language ? getLanguage(user.language) : null;
  const blocked = user.blockedYou || user.blockedByYou;
  const ageStr = formatProfileAge(user.age, ui);

  const details: { label: string; value: string }[] = [];
  if (ageStr) details.push({ label: ui.profileAge, value: ageStr });
  if (user.city) details.push({ label: ui.profileCity, value: user.city });
  if (user.country) details.push({ label: ui.profileCountry, value: user.country });
  if (user.address) details.push({ label: ui.profileAddress, value: user.address });
  if (user.workplace) details.push({ label: ui.profileWorkplace, value: user.workplace });
  if (user.education) details.push({ label: ui.profileEducation, value: user.education });
  if (user.graduatedFrom) details.push({ label: ui.profileGraduatedFrom, value: user.graduatedFrom });
  if (user.profession) details.push({ label: ui.profileProfession, value: user.profession });
  if (user.interests) details.push({ label: ui.profileInterests, value: user.interests });
  if (user.skills) details.push({ label: ui.profileSkills, value: user.skills });
  if (user.about) details.push({ label: ui.profileAbout, value: user.about });

  return (
    <div className="user-profile-card">
      <div className="user-profile-head">
        <UserAvatar
          userId={user.userId}
          name={user.name}
          avatar={user.avatarUrl || user.avatar}
          size="xl"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="user-profile-name">{user.name}</p>
          <p className="user-profile-id font-mono">{formatTcallId(user.tcallId)}</p>
          <p className="user-profile-meta">
            {lang && <span>{lang.flag} {lang.name}</span>}
            {user.online != null && (
              <span> · {user.online ? ui.online : ui.offline}</span>
            )}
            {user.status && user.status !== "available" && (
              <span> · {getStatusLabel(user.status, ui)}</span>
            )}
          </p>
          {user.bio && <p className="user-profile-bio">{user.bio}</p>}
          {user.blockedYou && <p className="user-profile-warn">{ui.blockedYou}</p>}
          {user.blockedByYou && <p className="user-profile-warn">{ui.blocked}</p>}
          {user.isFriend && (
            <p className="user-profile-friend-badge">
              <Check className="w-3 h-3" /> {ui.friends}
            </p>
          )}
        </div>
      </div>

      {details.length > 0 && (
        <div className="profile-details-block">
          <p className="profile-details-title">{ui.profileDetails}</p>
          {details.map((d) => (
            <ProfileRow key={d.label} label={d.label} value={d.value} />
          ))}
        </div>
      )}

      {!blocked && details.length === 0 && !user.bio && (
        <p className="text-xs text-slate-400 py-1">{ui.profileNoDetails}</p>
      )}

      {/* Kiruvchi unblock so'rovi */}
      {user.unblockRequestFromThem && (
        <div className="user-profile-unblock-banner">
          <p className="text-sm font-medium">{ui.unblockRequestIncoming}</p>
          <div className="flex gap-2 mt-2">
            <button type="button" className="friends-action-btn friends-action-call flex-1" onClick={onAcceptUnblock}>
              <Check className="w-4 h-4" /> {ui.acceptUnblock}
            </button>
            <button type="button" className="friends-action-btn friends-action-danger flex-1" onClick={onRejectUnblock}>
              <X className="w-4 h-4" /> {ui.rejectUnblock}
            </button>
          </div>
        </div>
      )}

      {/* Kiruvchi do'stlik so'rovi */}
      {user.friendRequestReceived && !user.isFriend && (
        <div className="user-profile-friend-req-banner">
          <p className="text-sm font-semibold text-brand-700">{ui.incomingFriendRequests}</p>
          <div className="flex gap-2 mt-2">
            <button type="button" className="friends-action-btn friends-action-call flex-1" onClick={onAcceptFriendRequest} disabled={loading}>
              <Check className="w-4 h-4" /> {ui.acceptFriend}
            </button>
            <button type="button" className="friends-action-btn friends-action-danger flex-1" onClick={onCancelFriendRequest} disabled={loading}>
              <X className="w-4 h-4" /> {ui.rejectFriend}
            </button>
          </div>
        </div>
      )}

      <div className="user-profile-actions">
        <button
          type="button"
          className="user-profile-action user-profile-action-msg"
          disabled={blocked || loading}
          onClick={onMessage}
        >
          <MessageSquare className="w-4 h-4" /> SMS
        </button>
        <button
          type="button"
          className="user-profile-action user-profile-action-call"
          disabled={blocked || loading}
          onClick={onCall}
        >
          <Phone className="w-4 h-4" /> {ui.call}
        </button>
      </div>

      <div className="user-profile-secondary">
        {/* Do'st emas, so'rov yo'q, bloklangan emas */}
        {!user.isFriend && !blocked && !user.friendRequestSent && !user.friendRequestReceived && onSendFriendRequest && (
          <button type="button" className="user-profile-link-btn" onClick={onSendFriendRequest} disabled={loading}>
            <UserPlus className="w-3.5 h-3.5" /> {ui.addFriend}
          </button>
        )}

        {/* So'rov yuborilgan, kutilmoqda */}
        {!user.isFriend && user.friendRequestSent && (
          <div className="user-profile-pending-row">
            <span className="user-profile-pending-text">
              <Clock className="w-3.5 h-3.5" /> {ui.friendRequestPending}
            </span>
            {onCancelFriendRequest && (
              <button type="button" className="user-profile-link-btn-sm user-profile-link-danger" onClick={onCancelFriendRequest} disabled={loading}>
                {ui.cancelFriendRequest}
              </button>
            )}
          </div>
        )}

        {/* Do'st — o'chirish */}
        {user.isFriend && onRemoveFriend && (
          <button type="button" className="user-profile-link-btn" onClick={onRemoveFriend} disabled={loading}>
            <UserMinus className="w-3.5 h-3.5" /> {ui.removeFriend}
          </button>
        )}

        {/* Bloklangan — unblock */}
        {user.blockedByYou && onUnblock && (
          <button type="button" className="user-profile-link-btn" onClick={onUnblock} disabled={loading}>
            <ShieldOff className="w-3.5 h-3.5" /> {ui.unblock}
          </button>
        )}

        {/* Bloklash */}
        {!user.blockedByYou && !user.blockedYou && onBlock && (
          <button type="button" className="user-profile-link-btn user-profile-link-danger" onClick={onBlock} disabled={loading}>
            <Shield className="w-3.5 h-3.5" /> {ui.block}
          </button>
        )}

        {onReport && (
          <button type="button" className="user-profile-link-btn user-profile-link-danger" onClick={onReport} disabled={loading}>
            {ui.reportUser}
          </button>
        )}

        {/* Sizi bloklaganlar uchun unblock so'rovi */}
        {user.blockedYou && !user.unblockRequestPending && onRequestUnblock && (
          <button type="button" className="user-profile-link-btn" onClick={onRequestUnblock} disabled={loading}>
            <HandHelping className="w-3.5 h-3.5" /> {ui.requestUnblock}
          </button>
        )}
        {user.blockedYou && user.unblockRequestPending && (
          <span className="text-xs text-slate-500">{ui.unblockRequestSent}</span>
        )}
      </div>
    </div>
  );
}
