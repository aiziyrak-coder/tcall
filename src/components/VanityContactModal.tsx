"use client";

import { MessageCircle, X } from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";
import { formatVanityPrice } from "@/lib/vanity-pricing";
import { ADMIN_TELEGRAM_URL, ADMIN_TELEGRAM_USERNAME } from "@/lib/admin-config";

interface VanityContactModalProps {
  number: string;
  price: number;
  tier: string;
  ui: Record<string, string>;
  onClose: () => void;
}

export function VanityContactModal({ number, price, tier, ui, onClose }: VanityContactModalProps) {
  const telegramText = encodeURIComponent(
    `Assalomu alaykum! Tcall chiroyli raqam so'rovi:\nRaqam: ${formatTcallId(number)}\nNarx: ${formatVanityPrice(price)}\nTier: ${tier}`
  );
  const telegramUrl = `${ADMIN_TELEGRAM_URL}?text=${telegramText}`;

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal-panel vanity-contact-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="ios-modal-close" aria-label="Yopish">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <h2 className="text-xl font-bold text-slate-900">{ui.vanityRequestSent}</h2>
          <p className="text-slate-500 text-sm mt-2">{ui.vanityRequestHint}</p>
        </div>

        <div className="vanity-contact-card">
          <p className="text-xs text-slate-500 mb-1">{ui.selectedNumber}</p>
          <p className="font-mono text-2xl font-bold text-brand-600">{formatTcallId(number)}</p>
          <p className="text-sm text-slate-600 mt-2 capitalize">
            {tier} · {formatVanityPrice(price)}
          </p>
        </div>

        <div className="vanity-contact-pending">
          <p className="text-sm text-amber-800">{ui.vanityPendingNote}</p>
        </div>

        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
        >
          <MessageCircle className="w-5 h-5" />
          {ui.contactAdmin} @{ADMIN_TELEGRAM_USERNAME}
        </a>

        <button type="button" onClick={onClose} className="btn-secondary w-full mt-3">
          {ui.close}
        </button>
      </div>
    </div>
  );
}
