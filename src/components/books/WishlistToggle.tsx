"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";

export function WishlistToggle({ bookId, initialWishlisted }: { bookId: number; initialWishlisted: boolean }) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !wishlisted;
    setWishlisted(next);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (res.status === 401) {
        setWishlisted(!next);
        router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) setWishlisted(!next);
      else router.refresh();
    } catch {
      setWishlisted(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
        wishlisted ? "border-red-200 bg-red-50 text-red-600" : "border-[#e2e8f0] text-[#475569] hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
      }`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />}
      <span className="hidden sm:inline">{wishlisted ? "Saved" : "Wishlist"}</span>
    </button>
  );
}
