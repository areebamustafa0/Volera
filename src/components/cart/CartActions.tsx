"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Minus, Plus, AlertCircle } from "lucide-react";

export function CartActions({
  itemId,
  quantity,
  isEbook,
  maxQuantity = 10,
}: {
  itemId: number;
  quantity: number;
  isEbook: boolean;
  maxQuantity?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const update = (newQty: number) => {
    setError("");
    start(async () => {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity: newQty }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not update quantity");
        return;
      }
      router.refresh();
    });
  };

  const remove = () => {
    start(async () => {
      await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1 mt-1">
      <div className="flex items-center gap-1.5">
        {!isEbook && (
          <div className="flex items-center border border-[#e2e8f0] rounded-lg overflow-hidden">
            <button
              onClick={() => (quantity > 1 ? update(quantity - 1) : remove())}
              disabled={pending}
              className="w-7 h-7 flex items-center justify-center text-[#475569] hover:bg-[#f1f4f9] disabled:opacity-40 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-sm font-semibold text-[#0f172a]" aria-live="polite">{quantity}</span>
            <button
              onClick={() => update(quantity + 1)}
              disabled={pending || quantity >= maxQuantity}
              className="w-7 h-7 flex items-center justify-center text-[#475569] hover:bg-[#f1f4f9] disabled:opacity-40 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
        <button
          onClick={remove}
          disabled={pending}
          className="w-7 h-7 flex items-center justify-center text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40 transition-colors"
          aria-label="Remove item"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
