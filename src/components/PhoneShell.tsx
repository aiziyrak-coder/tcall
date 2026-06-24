"use client";

import { type ReactNode } from "react";
import {
  Phone,
  Clock,
  Users,
  Link2,
  Sparkles,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { getUI } from "@/lib/languages";
import { TcallLogo } from "@/components/TcallLogo";

export type PhoneTab = "keypad" | "recents" | "contacts" | "room" | "numbers" | "messages";

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
  { id: "contacts", icon: Users, labelKey: "contacts" },
  { id: "room", icon: Link2, labelKey: "roomTab" },
  { id: "numbers", icon: Sparkles, labelKey: "vanityNumbers" },
];

const TAB_ICONS: Record<PhoneTab, LucideIcon> = {
  keypad: Phone,
  recents: Clock,
  contacts: Users,
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
    <div className="ios-phone-app">
      {!hideHeader && header && <div className="ios-phone-header">{header}</div>}
      <main className={`ios-phone-content${contentClassName ? ` ${contentClassName}` : ""}`}>{children}</main>
      <nav className="ios-tab-bar ios-tab-bar-6">
        {TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = activeTab === id;
          const badge = badges?.[id];
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`ios-tab-item ${active ? "ios-tab-active" : ""}`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                {badge != null && badge > 0 && (
                  <span className="ios-tab-badge">{badge > 9 ? "9+" : badge}</span>
                )}
              </span>
              <span className="text-[10px]">{ui[labelKey] as string}</span>
            </button>
          );
        })}
      </nav>
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
