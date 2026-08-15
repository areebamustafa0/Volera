"use client";

import React, { useState } from "react";
import { Check, ShoppingBag, Loader2 } from "lucide-react";

/** Compact add-to-bag control for editorial list layouts. */
export function AddToBagButton({ bookId, formatId }: { bookId: number; formatId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");

  const add = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, formatId, quantity: 1 }),
      });
      if (res.ok) {
        setState("added");
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      onClick={add}
      disabled={state === "loading"}
      aria-label="Add to bag"
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors whitespace-nowrap ${
        state === "added"
          ? "bg-[#28382F] text-[#F7F3EC]"
          : "bg-[#171513] text-[#F7F3EC] hover:bg-[#C8A96B] hover:text-[#171513]"
      }`}
    >
      {state === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {state === "added" && <Check className="w-3.5 h-3.5" />}
      {state === "idle" && <ShoppingBag className="w-3.5 h-3.5" />}
      {state === "added" ? "Added" : "Add to Bag"}
    </button>
  );
}
