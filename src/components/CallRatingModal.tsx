"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useUI } from "@/components/providers/LocaleProvider";

interface CallRatingModalProps {
  callId: string;
  userLanguage: string;
  onClose: () => void;
}

export function CallRatingModal({ callId, userLanguage, onClose }: CallRatingModalProps) {
  const ui = useUI(userLanguage);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { onClose(); return; }
    setSubmitting(true);
    try {
      await apiFetch("/api/calls/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, rating, feedback: feedback.trim() || undefined }),
      });
    } catch {
      /* ignore */
    } finally {
      onClose();
    }
  };

  return (
    <div className="call-rating-overlay" onClick={onClose}>
      <div className="call-rating-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="call-rating-title">{ui.callRateTitle}</h3>
        <p className="call-rating-desc">{ui.callRateDesc}</p>

        <div className="call-rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`call-rating-star ${star <= (hover || rating) ? "call-rating-star-active" : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${star} yulduz`}
            >
              <Star className="w-8 h-8" fill={star <= (hover || rating) ? "currentColor" : "none"} />
            </button>
          ))}
        </div>

        {rating > 0 && rating <= 3 && (
          <textarea
            className="input-field-compact min-h-[72px] resize-none mt-3"
            placeholder={ui.callRateFeedback as string}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={500}
          />
        )}

        <div className="flex gap-3 mt-4">
          <button type="button" className="btn-secondary btn-compact flex-1" onClick={onClose} disabled={submitting}>
            {ui.callRateSkip}
          </button>
          <button type="button" className="btn-primary btn-compact flex-1" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "..." : ui.callRateSend}
          </button>
        </div>
      </div>
    </div>
  );
}
