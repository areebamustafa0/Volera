"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, Check, AlertCircle } from "lucide-react";

/**
 * Adds a specific format to the cart, then routes onward.
 * `mode="buy"` goes straight to checkout; `mode="cart"` stays on the page.
 * Quantity and stock are always re-validated server-side — the client value
 * is only a request, never trusted.
 */
export function BuyButton({
  bookId,
  formatId,
  quantity = 1,
  mode = "cart",
  label,
  className = "",
  disabled = false,
}: {
  bookId: number;
  formatId: number;
  quantity?: number;
  mode?: "buy" | "cart";
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  const click = async () => {
    setState("loading");
    setError("");

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, formatId, quantity }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not add to cart");
      setState("idle");
      return;
    }

    if (mode === "buy") {
      router.push("/checkout");
      return;
    }

    setState("done");
    router.refresh();
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <div>
      <button
        onClick={click}
        disabled={state === "loading" || disabled}
        className={
          className ||
          "bg-blue-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
        }
      >
        {state === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="w-4 h-4" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {state === "done" ? "Added to cart" : label || (mode === "buy" ? "Buy Now" : "Add to Cart")}
      </button>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
