"use client";

import { type ReactNode } from "react";
import {
  Phone,
  Clock,
  UserRoundSearch,
  Link2,
  Sparkles,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { getUI } from "@/lib/languages";
import { TcallLogo } from "@/components/TcallLogo";

export type PhoneTab = "keypad" | "recents" | "friends" | "room" | "numbers" | "messages";

interface PhoneShellProps {
  userLanguage: string;
  activeTab: PhoneTab;
  onTabChange: (tab: PhoneTab) => void;
  header?: ReactNode;
  children: ReactNode;
  badges?: Partial<Record<PhoneTab, number>>;
  hideHeader?: boolean;
  contentClassName?: string;
}

const TABS: { id: PhoneTab; icon: typeof Phone; labelKey: keyof ReturnType<typeof getUI> }[] = [
  { id: "recents", icon: Clock, labelKey: "recents" },
  { id: "messages", icon: MessageSquare, labelKey: "messages" },
  { id: "keypad", icon: Phone, labelKey: "keypad" },
  { id: "friends", icon: UserRoundSearch, labelKey: "friendsTab" },
  { id: "room", icon: Link2, labelKey: "roomTab" },
  { id: "numbers", icon: Sparkles, labelKey: "vanityNumbers" },
];

const TAB_ICONS: Record<PhoneTab, LucideIcon> = {
  keypad: Phone,
  recents: Clock,
  friends: UserRoundSearch,
  room: Link2,
  numbers: Sparkles,
  messages: MessageSquare,
};

export function PhoneShell({
  userLanguage,
  activeTab,
  onTabChange,
  header,
  children,
  badges,
  hideHeader,
  contentClassName,
}: PhoneShellProps) {
  const ui = getUI(userLanguage);

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navigation">
        <div className="app-sidebar-brand">
          <TcallLogo size="xs" variant="icon" className="app-sidebar-logo-icon" />
          <span className="app-sidebar-brand-text">Tcall</span>
        </div>
        <nav className="app-sidebar-nav">
          {TABS.map(({ id, icon: Icon, labelKey }) => {
            const active = activeTab === id;
            const badge = badges?.[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`app-sidebar-item ${active ? "app-sidebar-item-active" : ""}`}
                title={ui[labelKey] as string}
              >
                <span className="app-sidebar-icon-wrap">
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                  {badge != null && badge > 0 && (
                    <span className="app-sidebar-badge">{badge > 9 ? "9+" : badge}</span>
                  )}
                </span>
                <span className="app-sidebar-label">{ui[labelKey] as string}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-main">
        {!hideHeader && header && <header className="app-main-header">{header}</header>}
        <main className={`app-main-content${contentClassName ? ` ${contentClassName}` : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export interface PhoneHeaderContext {
  tab: PhoneTab;
  tabLabel: string;
  userFlag?: string;
  userName?: string;
}

export function PhoneHeader({
  title,
  subtitle,
  right,
  showLogo,
  context,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showLogo?: boolean;
  context?: PhoneHeaderContext;
}) {
  const TabIcon = context ? TAB_ICONS[context.tab] : Phone;
  const initial = context?.userName?.trim().charAt(0).toUpperCase() || "?";
  const contextOnly = !!context && !showLogo;

  return (
    <div className={`phone-header-shell${contextOnly ? " phone-header-shell-compact" : ""}`}>
      <div className="phone-header-row">
        {showLogo ? (
          <TcallLogo size="sm" layout="horizontal" variant="full" className="phone-header-logo" />
        ) : contextOnly ? (
          <div className="phone-header-context phone-header-context-inline">
            <div className="phone-header-tab-pill">
              <span className="phone-header-tab-icon">
                <TabIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
              </span>
              <span className="phone-header-tab-label">{context.tabLabel}</span>
            </div>
            {context.userName && (
              <div className="phone-header-user-chip">
                <span className="phone-header-avatar">{initial}</span>
                <span className="phone-header-user-text">
                  {context.userFlag && (
                    <span className="phone-header-flag" aria-hidden>
                      {context.userFlag}
                    </span>
                  )}
                  <span className="phone-header-user-name">{context.userName}</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="phone-header-title-only">
            <h1 className="phone-header-page-title">{title}</h1>
            {subtitle && !context && (
              <p className="phone-header-page-sub">{subtitle}</p>
            )}
          </div>
        )}
        {right && <div className="phone-header-actions">{right}</div>}
      </div>

      {context && showLogo && (
        <div className="phone-header-context">
          <div className="phone-header-tab-pill">
            <span className="phone-header-tab-icon">
              <TabIcon className="w-3.5 h-3.5" strokeWidth={2.2} />
            </span>
            <span className="phone-header-tab-label">{context.tabLabel}</span>
          </div>
          {context.userName && (
            <div className="phone-header-user-chip">
              <span className="phone-header-avatar">{initial}</span>
              <span className="phone-header-user-text">
                {context.userFlag && (
                  <span className="phone-header-flag" aria-hidden>
                    {context.userFlag}
                  </span>
                )}
                <span className="phone-header-user-name">{context.userName}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
