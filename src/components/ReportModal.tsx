"use client";

import { useState } from "react";
import { X, Flag } from "lucide-react";
import { apiFetch } from "@/lib/api";

const REASONS = [
  "spam",
  "harassment",
  "pornographic",
  "illegal",
  "political",
  "other",
] as const;

type ReportReason = (typeof REASONS)[number];

interface ReportModalProps {
  ui: Record<string, string>;
  type: "chat" | "profile" | "call" | "other";
  targetId: string;
  targetLabel?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReportModal({
  ui,
  type,
  targetId,
  targetLabel,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const reasonLabel = (r: ReportReason) => {
    const key = `reportReason_${r}` as keyof typeof ui;
    return (ui[key] as string) || r;
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await apiFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, reason, notes: notes.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || ui.reportFailed);
      setDone(true);
      onSubmitted?.();
      setTimeout(onClose, 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.reportFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            {ui.reportTitle}
          </h3>
          <button type="button" onClick={onClose} className="ios-icon-btn" aria-label={ui.close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {targetLabel && (
          <p className="text-sm text-slate-500 mb-3 truncate">{targetLabel}</p>
        )}

        {done ? (
          <p className="text-sm text-green-600 py-4 text-center">{ui.reportSubmitted}</p>
        ) : (
          <>
            <p className="text-sm text-slate-600 mb-2">{ui.reportReasonLabel}</p>
            <div className="report-reason-grid mb-3">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`report-reason-chip${reason === r ? " report-reason-chip-active" : ""}`}
                  onClick={() => setReason(r)}
                >
                  {reasonLabel(r)}
                </button>
              ))}
            </div>
            <textarea
              className="input-field-compact w-full min-h-[72px] resize-none mb-3"
              placeholder={ui.reportNotesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              maxLength={500}
            />
            {error && <div className="ios-error-banner mb-3">{error}</div>}
            <button
              type="button"
              className="btn-primary btn-compact w-full"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "..." : ui.reportSubmit}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
