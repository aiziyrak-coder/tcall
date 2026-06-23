"use client";

import { useState } from "react";
import { Phone, Star } from "lucide-react";
import { formatTcallId } from "@/lib/tcallId";
import { getUI } from "@/lib/languages";
import { useCallContext } from "@/components/providers/CallProvider";

interface SpeedDialProps {
  userLanguage: string;
  favorites: { name: string; tcallId: string }[];
}

export function SpeedDial({ userLanguage, favorites }: SpeedDialProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();

  if (favorites.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
        <Star className="w-3 h-3 text-yellow-400" /> {ui.speedDial}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {favorites.slice(0, 6).map((f) => (
          <button
            key={f.tcallId}
            onClick={() => void dial(f.tcallId)}
            className="ios-speed-dial-btn shrink-0"
          >
            <div className="ios-contact-avatar w-12 h-12 text-base">{f.name[0]?.toUpperCase()}</div>
            <span className="text-xs truncate max-w-[4rem]">{f.name.split(" ")[0]}</span>
            <span className="text-[10px] text-white/30 font-mono">{formatTcallId(f.tcallId).slice(-4)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
