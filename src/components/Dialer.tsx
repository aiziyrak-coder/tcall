"use client";

import { useState, useCallback, useEffect } from "react";
import { Phone, Delete, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage, getUI } from "@/lib/languages";
import { getStatusLabel } from "@/lib/status";
import { playDialTone, unlockAudio } from "@/lib/ringtone";
import { useCallContext } from "@/components/providers/CallProvider";

interface DialerProps {
  userLanguage: string;
}

const KEYPAD: { digit: string; letters?: string }[] = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*" },
  { digit: "0", letters: "+" },
  { digit: "#" },
];

export function Dialer({ userLanguage }: DialerProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();
  const [digits, setDigits] = useState("");
  const [lookupName, setLookupName] = useState<string | null>(null);
  const [lookupLang, setLookupLang] = useState<string | null>(null);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  const [lookupOnline, setLookupOnline] = useState<boolean | null>(null);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState("");
  const [addedContact, setAddedContact] = useState(false);

  useEffect(() => {
    if (digits.length !== 9) {
      setLookupName(null);
      setLookupStatus(null);
      setLookupOnline(null);
      setAddedContact(false);
      return;
    }

    const timer = setTimeout(() => {
      apiFetch(`/api/users/lookup?tcallId=${digits}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.found && d.user) {
            setLookupName(d.user.name);
            setLookupLang(d.user.language);
            setLookupStatus(d.user.status);
            setLookupOnline(d.user.online);
            if (d.user.blockedYou) setError(ui.blocked);
          } else {
            setLookupName(null);
          }
        })
        .catch(() => setLookupName(null));
    }, 250);

    return () => clearTimeout(timer);
  }, [digits, ui.blocked]);

  const press = useCallback((key: string) => {
    void unlockAudio();
    playDialTone();
    if (key === "del") {
      setDigits((d) => d.slice(0, -1));
      setError("");
      return;
    }
    if (key === "*" || key === "#") return;
    if (digits.length >= 9) return;
    setDigits((d) => d + key);
    setError("");
  }, [digits.length]);

  const handleCall = useCallback(async () => {
    if (digits.length !== 9) return;
    setCalling(true);
    setError("");
    try {
      await dial(digits);
      setDigits("");
      setLookupName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCalling(false);
    }
  }, [digits, dial]);

  const addContact = async () => {
    if (!lookupName || digits.length !== 9) return;
    const res = await apiFetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: lookupName, tcallId: digits }),
    });
    if (res.ok) {
      setAddedContact(true);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Enter") handleCall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, handleCall]);

  const partnerLang = lookupLang ? getLanguage(lookupLang) : null;

  return (
    <div className="ios-keypad">
      <div className="ios-keypad-display">
        {lookupName ? (
          <>
            <p className="ios-keypad-name animate-fade-in">{lookupName} {partnerLang?.flag}</p>
            <p className="text-xs text-slate-500">
              {lookupOnline ? ui.online : ui.offline}
              {lookupStatus && lookupStatus !== "available" && (
                <> · {getStatusLabel(lookupStatus, ui)}</>
              )}
            </p>
          </>
        ) : digits.length === 9 ? (
          <p className="ios-keypad-error">{ui.numberNotFound}</p>
        ) : (
          <p className="ios-keypad-hint">{ui.dialNumber}</p>
        )}
        <p className="ios-keypad-number">{digits ? formatTcallId(digits) : ""}</p>
        {error && <p className="ios-keypad-error mt-1">{error}</p>}
        {lookupName && !addedContact && (
          <button onClick={() => void addContact()} className="text-xs text-brand-400 mt-2 flex items-center gap-1 mx-auto">
            <UserPlus className="w-3 h-3" /> {ui.addToContacts}
          </button>
        )}
      </div>

      <div className="ios-keypad-grid">
        {KEYPAD.map(({ digit, letters }) => (
          <button
            key={digit}
            onClick={() => press(digit)}
            className="ios-key"
            disabled={digit === "*" || digit === "#"}
          >
            <span className="ios-key-digit">{digit}</span>
            {letters && <span className="ios-key-letters">{letters}</span>}
          </button>
        ))}
      </div>

      <div className="ios-keypad-bottom">
        <div className="w-16" />
        <button
          onClick={handleCall}
          disabled={digits.length !== 9 || calling}
          className="ios-call-green-btn"
          aria-label={ui.startCall}
        >
          <Phone className="w-8 h-8" />
        </button>
        <button
          onClick={() => press("del")}
          className="ios-key-delete w-16 h-16 flex items-center justify-center"
          aria-label="Delete"
        >
          <Delete className="w-6 h-6 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
