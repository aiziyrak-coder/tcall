"use client";

import { type ReactNode } from "react";
import {
  Phone,
  UserRoundSearch,
  Link2,
  Sparkles,
  MessageSquare,
  Languages,
  type LucideIcon,
} from "lucide-react";
import { useUI } from "@/components/providers/LocaleProvider";
import type { UIText } from "@/lib/ui-locale-service";
import { TcallLogo } from "@/components/TcallLogo";
import { useMobileBottomNav } from "@/hooks/useMobileBottomNav";

export type PhoneTab = "keypad" | "friends" | "room" | "numbers" | "messages" | "interpreter";

interface PhoneShellProps {
  userLanguage: string;
  activeTab: PhoneTab;
  onTabChange: (tab: PhoneTab) => void;
  header?: ReactNode;
  children: ReactNode;
  badges?: Partial<Record<PhoneTab, number>>;
  hideHeader?: boolean;
  hideTabBar?: boolean;
  contentClassName?: string;
}

const NAV_TABS: { id: PhoneTab; icon: LucideIcon; labelKey: keyof UIText }[] = [
  { id: "messages", icon: MessageSquare, labelKey: "messages" },
  { id: "friends", icon: UserRoundSearch, labelKey: "friendsTab" },
  { id: "keypad", icon: Phone, labelKey: "keypad" },
  { id: "room", icon: Link2, labelKey: "roomTab" },
  { id: "interpreter", icon: Languages, labelKey: "interpreterTab" },
];

const MOBILE_TABS: { id: PhoneTab; icon: LucideIcon; labelKey: keyof UIText; center?: boolean }[] = [
  { id: "messages", icon: MessageSquare, labelKey: "messages" },
  { id: "friends", icon: UserRoundSearch, labelKey: "friendsTab" },
  { id: "keypad", icon: Phone, labelKey: "keypad", center: true },
  { id: "room", icon: Link2, labelKey: "roomTab" },
  { id: "interpreter", icon: Languages, labelKey: "interpreterTab" },
];

export const TAB_ICONS: Record<PhoneTab, LucideIcon> = {
  keypad: Phone,
  friends: UserRoundSearch,
  room: Link2,
  numbers: Sparkles,
  messages: MessageSquare,
  interpreter: Languages,
};

function SidebarNav({
  ui,
  activeTab,
  onTabChange,
  badges,
}: {
  ui: UIText;
  activeTab: PhoneTab;
  onTabChange: (tab: PhoneTab) => void;
  badges?: Partial<Record<PhoneTab, number>>;
}) {
  return (
    <aside className="app-sidebar" aria-label="Navigation">
      <div className="app-sidebar-brand">
        <TcallLogo size="xs" variant="icon" className="app-sidebar-logo-icon" />
        <span className="app-sidebar-brand-text">Tcall</span>
      </div>
      <nav className="app-sidebar-nav">
        {NAV_TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = activeTab === id;
          const badge = badges?.[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`app-sidebar-item${id === "keypad" ? " app-sidebar-item-keypad" : ""} ${active ? "app-sidebar-item-active" : ""}`}
              title={ui[labelKey] as string}
              aria-label={ui[labelKey] as string}
              aria-current={active ? "page" : undefined}
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
  );
}

function BottomTabBar({
  ui,
  activeTab,
  onTabChange,
  badges,
}: {
  ui: UIText;
  activeTab: PhoneTab;
  onTabChange: (tab: PhoneTab) => void;
  badges?: Partial<Record<PhoneTab, number>>;
}) {
  return (
    <nav className="liquid-tab-bar" aria-label="Navigation">
      <div className="liquid-tab-bar-inner">
        {MOBILE_TABS.map(({ id, icon: Icon, labelKey, center }) => {
          const active = activeTab === id;
          const badge = badges?.[id];

          if (center) {
            return (
              <button
                key={id}
                type="button"
                className={`liquid-tab-item liquid-tab-item-center${active ? " liquid-tab-item-active" : ""}`}
                onClick={() => onTabChange(id)}
                aria-label={ui[labelKey] as string}
                aria-current={active ? "page" : undefined}
              >
                <span className="liquid-tab-center-ring" aria-hidden />
                <span className="liquid-tab-center-btn">
                  <Icon className="w-[22px] h-[22px] text-[var(--accent-ink)]" strokeWidth={2.2} />
                  {badge != null && badge > 0 && (
                    <span className="liquid-tab-badge liquid-tab-center-badge">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className="liquid-tab-label liquid-tab-label-center">{ui[labelKey] as string}</span>
              </button>
            );
          }

          return (
            <button
              key={id}
              type="button"
              className={`liquid-tab-item${active ? " liquid-tab-item-active" : ""}`}
              onClick={() => onTabChange(id)}
              aria-label={ui[labelKey] as string}
              aria-current={active ? "page" : undefined}
            >
              <span className="liquid-tab-pill" aria-hidden />
              <span className="liquid-tab-icon-wrap">
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                {badge != null && badge > 0 && (
                  <span className="liquid-tab-badge">{badge > 9 ? "9+" : badge}</span>
                )}
              </span>
              <span className="liquid-tab-label">{ui[labelKey] as string}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function PhoneShell({
  userLanguage,
  activeTab,
  onTabChange,
  header,
  children,
  badges,
  hideHeader,
  hideTabBar,
  contentClassName,
}: PhoneShellProps) {
  const ui = useUI(userLanguage);
  const bottomNav = useMobileBottomNav();

  const shellClass = [
    "app-shell",
    bottomNav ? "app-shell-bottom-nav" : "",
    bottomNav && hideTabBar ? "app-shell-no-tabbar" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={shellClass}>
      <div className="liquid-bg-orbs" aria-hidden />

      {!bottomNav && (
        <SidebarNav ui={ui} activeTab={activeTab} onTabChange={onTabChange} badges={badges} />
      )}

      <div className="app-main">
        {!hideHeader && header && (
          <header className="app-main-header liquid-header">{header}</header>
        )}
        <main className={`app-main-content${contentClassName ? ` ${contentClassName}` : ""}`}>
          {children}
        </main>
      </div>

      {bottomNav && !hideTabBar && (
        <BottomTabBar
          ui={ui}
          activeTab={activeTab}
          onTabChange={onTabChange}
          badges={badges}
        />
      )}
    </div>
  );
}

export interface PhoneHeaderContext {
  tab: PhoneTab;
  tabLabel: string;
  userFlag?: string;
  userName?: string;
  userCaption?: string;
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
  const initial = context?.userCaption ? "#" : context?.userName?.trim().charAt(0).toUpperCase() || "?";

  const contextNode = context ? (
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
          <span className={`phone-header-user-text${context.userCaption ? " phone-header-user-text-stack" : ""}`}>
            {context.userCaption && <span className="phone-header-user-caption">{context.userCaption}</span>}
            <span className="phone-header-user-main">
              {context.userFlag && (
                <span className="phone-header-flag" aria-hidden>
                  {context.userFlag}
                </span>
              )}
              <span className="phone-header-user-name">{context.userName}</span>
            </span>
          </span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="phone-header-shell">
      <div className="phone-header-row">
        {showLogo && (
          <TcallLogo size="sm" variant="full" className="phone-header-logo" />
        )}
        {contextNode}
        {!showLogo && !context && (
          <div className="phone-header-title-only">
            <h1 className="phone-header-page-title">{title}</h1>
            {subtitle && <p className="phone-header-page-sub">{subtitle}</p>}
          </div>
        )}
        {right && <div className="phone-header-actions">{right}</div>}
      </div>
    </div>
  );
}
