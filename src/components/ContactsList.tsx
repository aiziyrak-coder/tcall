"use client";

import { Phone } from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage, getUI } from "@/lib/languages";
import { useCallContext } from "@/components/providers/CallProvider";

interface Contact {
  name: string;
  tcallId: string;
  language: string;
}

interface ContactsListProps {
  userLanguage: string;
  contacts: Contact[];
}

export function ContactsList({ userLanguage, contacts }: ContactsListProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();

  if (contacts.length === 0) {
    return (
      <div className="ios-empty-state">
        <p>{ui.noContacts}</p>
        <p className="text-xs text-white/30 mt-2">{ui.noContactsDesc}</p>
      </div>
    );
  }

  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    const letter = c.name[0]?.toUpperCase() || "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <div className="ios-contacts">
      {letters.map((letter) => (
        <div key={letter}>
          <p className="ios-section-header">{letter}</p>
          <ul className="ios-list">
            {grouped[letter].map((contact) => {
              const lang = getLanguage(contact.language);
              return (
                <li key={contact.tcallId} className="ios-list-item ios-contact-item">
                  <div className="ios-contact-avatar">{contact.name[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.name}</p>
                    <p className="text-xs text-white/40 font-mono">{formatTcallId(contact.tcallId)} · {lang.flag}</p>
                  </div>
                  <button
                    onClick={() => dial(contact.tcallId)}
                    className="ios-mini-call-btn"
                    aria-label={ui.startCall}
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
