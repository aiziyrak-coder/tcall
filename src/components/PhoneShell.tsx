"use client";

import { useState, type ReactNode } from "react";
import {
  Phone,
  Clock,
  UserRoundSearch,
  Link2,
  Sparkles,
  MessageSquare,
  Languages,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useUI } from "@/components/providers/LocaleProvider";
import type { UIText } from "@/lib/ui-locale-service";
import { TcallLogo } from "@/components/TcallLogo";
import { MoreMenuSheet } from "@/components/MoreMenuSheet";
import { useMobileBottomNav } from "@/hooks/useMobileBottomNav";

export type PhoneTab = "keypad" | "recents" | "friends" | "room" | "numbers" | "messages" | "interpreter";

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

const SIDEBAR_TABS: { id: PhoneTab; icon: LucideIcon; labelKey: keyof UIText }[] = [
  { id: "recents", icon: Clock, labelKey: "recents" },
  { id: "messages", icon: MessageSquare, labelKey: "messages" },
  { id: "keypad", icon: Phone, labelKey: "keypad" },
  { id: "friends", icon: UserRoundSearch, labelKey: "friendsTab" },
  { id: "room", icon: Link2, labelKey: "roomTab" },
  { id: "numbers", icon: Sparkles, labelKey: "vanityNumbers" },
];

const BOTTOM_TAB: { id: PhoneTab; icon: LucideIcon; labelKey: keyof UIText } = {
  id: "interpreter",
  icon: Languages,
  labelKey: "interpreterTab",
};

type MobileBarItem =
  | { kind: "tab"; id: PhoneTab; icon: LucideIcon; labelKey: keyof UIText; center?: boolean }
  | { kind: "more"; icon: LucideIcon; labelKey: "moreTab" };

const MOBILE_TABS: MobileBarItem[] = [
  { kind: "tab", id: "recents", icon: Clock, labelKey: "recents" },
  { kind: "tab", id: "messages", icon: MessageSquare, labelKey: "messages" },
  { kind: "tab", id: "keypad", icon: Phone, labelKey: "keypad", center: true },
  { kind: "tab", id: "friends", icon: UserRoundSearch, labelKey: "friendsTab" },
  { kind: "more", icon: LayoutGrid, labelKey: "moreTab" },
];

const MORE_TABS: PhoneTab[] = ["room", "numbers", "interpreter"];

export const TAB_ICONS: Record<PhoneTab, LucideIcon> = {
  keypad: Phone,
  recents: Clock,
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
        {SIDEBAR_TABS.map(({ id, icon: Icon, labelKey }) => {
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
        <div className="app-sidebar-spacer" aria-hidden />
        {(() => {
          const { id, icon: Icon, labelKey } = BOTTOM_TAB;
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`app-sidebar-item app-sidebar-item-bottom ${active ? "app-sidebar-item-active" : ""}`}
              title={ui[labelKey] as string}
            >
              <span className="app-sidebar-icon-wrap">
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
              </span>
              <span className="app-sidebar-label">{ui[labelKey] as string}</span>
            </button>
          );
        })()}
      </nav>
    </aside>
  );
}

function BottomTabBar({
  ui,
  activeTab,
  onTabChange,
  badges,
  onMoreOpen,
}: {
  ui: UIText;
  activeTab: PhoneTab;
  onTabChange: (tab: PhoneTab) => void;
  badges?: Partial<Record<PhoneTab, number>>;
  onMoreOpen: () => void;
}) {
  const moreActive = MORE_TABS.includes(activeTab);

  return (
    <nav className="liquid-tab-bar" aria-label="Navigation">
      <div className="liquid-tab-bar-inner">
        {MOBILE_TABS.map((tab) => {
          if (tab.kind === "more") {
            const active = moreActive;
            const Icon = tab.icon;
            return (
              <button
                key="more"
                type="button"
                className={`liquid-tab-item${active ? " liquid-tab-item-active" : ""}`}
                onClick={onMoreOpen}
                aria-label={ui.moreTab as string}
                aria-expanded={active}
              >
                <span className="liquid-tab-pill" aria-hidden />
                <span className="liquid-tab-icon-wrap">
                  <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span className="liquid-tab-label">{ui.moreTab as string}</span>
              </button>
            );
          }

          const { id, icon: Icon, labelKey, center } = tab;
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
                  <Icon className="w-[26px] h-[26px] text-white drop-shadow-sm" strokeWidth={2.0} />
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
  const [moreOpen, setMoreOpen] = useState(false);

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
          onMoreOpen={() => setMoreOpen(true)}
        />
      )}

      {moreOpen && (
        <MoreMenuSheet
          userLanguage={userLanguage}
          activeTab={activeTab}
          onSelect={onTabChange}
          onClose={() => setMoreOpen(false)}
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
          <TcallLogo size="xs" variant="icon" className="phone-header-logo" />
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
