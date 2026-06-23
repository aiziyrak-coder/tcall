"use client";

import { useState, useCallback, useEffect } from "react";
import { Phone, Delete } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage, getUI } from "@/lib/languages";

interface DialerProps {
  userLanguage: string;
  onCall: (tcallId: string) => void;
  calling?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function Dialer({ userLanguage, onCall, calling }: DialerProps) {
  const ui = getUI(userLanguage);
  const [digits, setDigits] = useState("");
  const [lookupName, setLookupName] = useState<string | null>(null);
  const [lookupLang, setLookupLang] = useState<string | null>(null);

  useEffect(() => {
    if (digits.length !== 9) {
      setLookupName(null);
      return;
    }

    const timer = setTimeout(() => {
      apiFetch(`/api/users/lookup?tcallId=${digits}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.found) {
            setLookupName(d.user.name);
            setLookupLang(d.user.language);
          } else {
            setLookupName(null);
          }
        })
        .catch(() => setLookupName(null));
    }, 300);

    return () => clearTimeout(timer);
  }, [digits]);

  const press = useCallback((key: string) => {
    if (key === "del") {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (!key || digits.length >= 9) return;
    setDigits((d) => d + key);
  }, [digits.length]);

  const handleCall = () => {
    if (digits.length === 9) onCall(digits);
  };

  const partnerLang = lookupLang ? getLanguage(lookupLang) : null;

  return (
    <div className="dialer">
      <div className="dialer-display">
        <p className="text-xs text-white/40 mb-1">{ui.dialNumber}</p>
        <p className="dialer-number">{digits ? formatTcallId(digits) : "— — —"}</p>
        {lookupName && (
          <p className="text-brand-300 text-sm mt-2 animate-fade-in">
            {lookupName} {partnerLang?.flag}
          </p>
        )}
        {digits.length === 9 && !lookupName && (
          <p className="text-red-400/80 text-xs mt-2">{ui.numberNotFound}</p>
        )}
      </div>

      <div className="dialer-grid">
        {KEYS.map((key, i) => {
          if (key === "") return <div key={i} />;
          if (key === "del") {
            return (
              <button key={i} onClick={() => press("del")} className="dialer-key dialer-key-action" aria-label="Delete">
                <Delete className="w-6 h-6" />
              </button>
            );
          }
          return (
            <button key={i} onClick={() => press(key)} className="dialer-key">
              <span className="text-2xl font-light">{key}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleCall}
        disabled={digits.length !== 9 || !lookupName || calling}
        className="dialer-call-btn"
        aria-label={ui.startCall}
      >
        <Phone className="w-7 h-7" />
      </button>
    </div>
  );
}
