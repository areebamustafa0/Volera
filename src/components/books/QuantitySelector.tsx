"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

export function QuantitySelector({
  value,
  onChange,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div className="inline-flex items-center border border-[#e2e8f0] rounded-lg" role="group" aria-label="Quantity">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="w-9 h-9 flex items-center justify-center text-[#475569] hover:bg-[#f1f4f9] disabled:opacity-40 transition-colors rounded-l-lg"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-10 text-center text-sm font-semibold text-[#0f172a]" aria-live="polite">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="w-9 h-9 flex items-center justify-center text-[#475569] hover:bg-[#f1f4f9] disabled:opacity-40 transition-colors rounded-r-lg"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
