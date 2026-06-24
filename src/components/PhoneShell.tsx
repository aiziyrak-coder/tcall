"use client";

import { type ReactNode } from "react";
import { Phone, Clock, Users, Link2, Sparkles, MessageSquare } from "lucide-react";
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
}

const TABS: { id: PhoneTab; icon: typeof Phone; labelKey: keyof ReturnType<typeof getUI> }[] = [
  { id: "recents", icon: Clock, labelKey: "recents" },
  { id: "messages", icon: MessageSquare, labelKey: "messages" },
  { id: "keypad", icon: Phone, labelKey: "keypad" },
  { id: "contacts", icon: Users, labelKey: "contacts" },
  { id: "room", icon: Link2, labelKey: "roomTab" },
  { id: "numbers", icon: Sparkles, labelKey: "vanityNumbers" },
];

export function PhoneShell({ userLanguage, activeTab, onTabChange, header, children, badges }: PhoneShellProps) {
  const ui = getUI(userLanguage);

  return (
    <div className="ios-phone-app">
      <div className="ios-phone-header">{header}</div>
      <main className="ios-phone-content">{children}</main>
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

export function PhoneHeader({
  title,
  subtitle,
  right,
  showLogo,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showLogo?: boolean;
}) {
  return (
    <div className="flex items-start justify-between px-1">
      <div>
        {showLogo ? (
          <div className="flex items-center gap-2.5">
            <TcallLogo size="sm" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          </div>
        ) : (
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        )}
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
