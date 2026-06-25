"use client";

import { Link2, Sparkles, Languages, X } from "lucide-react";
import { useUI } from "@/components/providers/LocaleProvider";
import type { PhoneTab } from "@/components/PhoneShell";

const MORE_ITEMS: { id: PhoneTab; icon: typeof Link2 }[] = [
  { id: "room", icon: Link2 },
  { id: "numbers", icon: Sparkles },
  { id: "interpreter", icon: Languages },
];

interface MoreMenuSheetProps {
  userLanguage: string;
  activeTab: PhoneTab;
  onSelect: (tab: PhoneTab) => void;
  onClose: () => void;
}

export function MoreMenuSheet({ userLanguage, activeTab, onSelect, onClose }: MoreMenuSheetProps) {
  const ui = useUI(userLanguage);

  const labels: Record<PhoneTab, string> = {
    keypad: ui.keypad,
    recents: ui.recents,
    friends: ui.friendsTab,
    room: ui.roomTab,
    numbers: ui.vanityNumbers,
    messages: ui.messages,
    interpreter: ui.interpreterTab,
  };

  return (
    <div className="liquid-more-overlay" role="presentation" onClick={onClose}>
      <div
        className="liquid-more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={ui.moreTab}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="liquid-more-handle" aria-hidden />
        <div className="liquid-more-header">
          <h2 className="liquid-more-title">{ui.moreTab}</h2>
          <button type="button" className="liquid-more-close" onClick={onClose} aria-label={ui.close}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="liquid-more-grid">
          {MORE_ITEMS.map(({ id, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                className={`liquid-more-item${active ? " liquid-more-item-active" : ""}`}
                onClick={() => {
                  onSelect(id);
                  onClose();
                }}
              >
                <span className="liquid-more-item-icon">
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.4 : 1.9} />
                </span>
                <span className="liquid-more-item-label">{labels[id]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
