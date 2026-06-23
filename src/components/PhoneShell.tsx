"use client";

import { type ReactNode } from "react";
import { Phone, Clock, Users, Link2, Sparkles } from "lucide-react";
import { getUI } from "@/lib/languages";

export type PhoneTab = "keypad" | "recents" | "contacts" | "room" | "numbers";

interface PhoneShellProps {
  userLanguage: string;
  activeTab: PhoneTab;
  onTabChange: (tab: PhoneTab) => void;
  header?: ReactNode;
  children: ReactNode;
}

const TABS: { id: PhoneTab; icon: typeof Phone; labelKey: keyof ReturnType<typeof getUI> }[] = [
  { id: "recents", icon: Clock, labelKey: "recents" },
  { id: "keypad", icon: Phone, labelKey: "keypad" },
  { id: "contacts", icon: Users, labelKey: "contacts" },
  { id: "room", icon: Link2, labelKey: "roomTab" },
  { id: "numbers", icon: Sparkles, labelKey: "vanityNumbers" },
];

export function PhoneShell({ userLanguage, activeTab, onTabChange, header, children }: PhoneShellProps) {
  const ui = getUI(userLanguage);

  return (
    <div className="ios-phone-app">
      <div className="ios-phone-header">
        {header}
      </div>

      <main className="ios-phone-content">{children}</main>

      <nav className="ios-tab-bar">
        {TABS.map(({ id, icon: Icon, labelKey }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`ios-tab-item ${active ? "ios-tab-active" : ""}`}
            >
              <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.8} />
              <span>{ui[labelKey] as string}</span>
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
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-1">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-white/45 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
