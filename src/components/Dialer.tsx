"use client";

import { useState, useCallback, useEffect } from "react";
import { Phone, Delete } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { useUI } from "@/components/providers/LocaleProvider";
import { playDialTone, unlockAudio } from "@/lib/ringtone";
import { useCallContext } from "@/components/providers/CallProvider";
import { UserProfileCard, type UserProfileData } from "@/components/UserProfileCard";
import { mapLookupUser } from "@/lib/user-profile";
import { TcallLogo } from "@/components/TcallLogo";

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
  { digit: "0", letters: "+" },
];

export function Dialer({ userLanguage }: DialerProps) {
  const ui = useUI(userLanguage);
  const { dial } = useCallContext();
  const [digits, setDigits] = useState("");
  const [lookupUser, setLookupUser] = useState<UserProfileData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const refreshLookup = useCallback(async (id: string) => {
    setLookupLoading(true);
    try {
      const r = await apiFetch(`/api/users/lookup?tcallId=${id}`);
      const d = await r.json();
      if (d.found && d.user) {
        setLookupUser(mapLookupUser(d.user));
        if (d.user.blockedYou) setError(ui.blocked);
        else setError("");
      } else {
        setLookupUser(null);
      }
    } finally {
      setLookupLoading(false);
    }
  }, [ui.blocked]);

  useEffect(() => {
    if (digits.length !== 9) {
      setLookupUser(null);
      setLookupLoading(false);
      return;
    }
    const timer = setTimeout(() => void refreshLookup(digits), 250);
    return () => clearTimeout(timer);
  }, [digits, refreshLookup]);

  const press = useCallback((key: string) => {
    void unlockAudio();
    playDialTone();
    if (key === "del") {
      setDigits((d) => d.slice(0, -1));
      setError("");
      return;
    }
    if (digits.length >= 9) return;
    if (digits.length === 0 && key === "0") {
      setError(ui.dialInvalidFirstDigit);
      return;
    }
    setDigits((d) => d + key);
    setError("");
  }, [digits.length, ui.dialInvalidFirstDigit]);

  const blocked = lookupUser?.blockedYou || lookupUser?.blockedByYou;

  const handleCall = useCallback(async () => {
    if (digits.length !== 9 || blocked) return;
    setCalling(true);
    setError("");
    try {
      await dial(digits);
      setDigits("");
      setLookupUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCalling(false);
    }
  }, [digits, dial, blocked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key >= "0" && e.key <= "9") press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Enter") void handleCall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, handleCall]);

  const runAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn();
      if (digits.length === 9) await refreshLookup(digits);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="ios-keypad">
      <div className="ios-keypad-display ios-keypad-display-scroll">
        {!lookupUser && !lookupLoading && digits.length !== 9 && (
          <p className="ios-keypad-hint">{ui.dialNumber}</p>
        )}
        {!lookupUser && !lookupLoading && digits.length === 9 && (
          <p className="ios-keypad-error">{ui.numberNotFound}</p>
        )}
        {lookupLoading && digits.length === 9 && (
          <div className="py-2 flex justify-center"><TcallLogo size="xs" animate /></div>
        )}
        <p className="ios-keypad-number">{digits ? formatTcallId(digits) : ""}</p>
        {error && <p className="ios-keypad-error mt-1">{error}</p>}

        {lookupUser && (
          <div className="mt-3 text-left dialer-profile-wrap">
            <UserProfileCard
              ui={ui}
              user={lookupUser}
              loading={actionLoading}
              onCall={() => void handleCall()}
              onMessage={() => {
                window.dispatchEvent(
                  new CustomEvent("tcall:open-chat", { detail: { tcallId: lookupUser.tcallId } })
                );
              }}
              onAddFriend={() =>
                runAction(async () => {
                  await apiFetch("/api/contacts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: lookupUser.name, tcallId: lookupUser.tcallId }),
                  });
                })
              }
              onBlock={() =>
                runAction(async () => {
                  await apiFetch("/api/blocks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tcallId: lookupUser.tcallId }),
                  });
                })
              }
              onUnblock={() =>
                runAction(async () => {
                  await apiFetch(`/api/blocks?tcallId=${lookupUser.tcallId}`, { method: "DELETE" });
                })
              }
              onRequestUnblock={() =>
                runAction(async () => {
                  await apiFetch("/api/blocks/unblock-request", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tcallId: lookupUser.tcallId }),
                  });
                })
              }
              onAcceptUnblock={() =>
                runAction(async () => {
                  await apiFetch("/api/blocks/unblock-request", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ requesterTcallId: lookupUser.tcallId, accept: true }),
                  });
                })
              }
              onRejectUnblock={() =>
                runAction(async () => {
                  await apiFetch("/api/blocks/unblock-request", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ requesterTcallId: lookupUser.tcallId, accept: false }),
                  });
                })
              }
              onRemoveFriend={
                lookupUser.isFriend
                  ? () =>
                      runAction(async () => {
                        const listRes = await apiFetch("/api/contacts");
                        const listData = await listRes.json();
                        const contact = (listData.contacts || []).find(
                          (c: { tcallId: string; id: string }) => c.tcallId === lookupUser.tcallId
                        );
                        if (!contact?.id) throw new Error(ui.chatActionFailed);
                        const del = await apiFetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
                        if (!del.ok) throw new Error(ui.chatActionFailed);
                      })
                  : undefined
              }
            />
          </div>
        )}
      </div>

      <div className="ios-keypad-grid">
        {KEYPAD.map(({ digit, letters }) => (
          <button
            key={digit}
            onClick={() => press(digit)}
            className="ios-key"
          >
            <span className="ios-key-digit">{digit}</span>
            {letters && <span className="ios-key-letters">{letters}</span>}
          </button>
        ))}
      </div>

      <div className="ios-keypad-bottom">
        <div className="w-16" />
        <button
          onClick={() => void handleCall()}
          disabled={digits.length !== 9 || calling || !!blocked}
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
