"use client";

import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";

/** Newsletter capture. Posts to the rate-limited, validated subscribe endpoint. */
export function NewsletterSignup({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setState("done");
        setEmail("");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p
        className={`flex items-center gap-2 text-sm font-medium ${
          dark ? "text-[#C8A96B]" : "text-[#28382F]"
        }`}
      >
        <Check className="w-4 h-4" /> Welcome to the Gazette. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        className={`flex-1 rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors ${
          dark
            ? "bg-[#F7F3EC]/10 border border-[#F7F3EC]/20 text-[#F7F3EC] placeholder:text-[#F7F3EC]/40 focus:border-[#C8A96B]"
            : "bg-white border border-[#171513]/15 text-[#171513] placeholder:text-[#171513]/35 focus:border-[#C8A96B]"
        }`}
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="inline-flex items-center justify-center gap-2 bg-[#C8A96B] text-[#171513] px-6 py-3 rounded-lg text-xs uppercase tracking-[0.16em] font-semibold hover:bg-[#171513] hover:text-[#F7F3EC] transition-colors disabled:opacity-60"
      >
        {state === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Subscribe
      </button>
      {state === "error" && (
        <span className="text-xs text-[#5A2630] self-center">Please check the address.</span>
      )}
    </form>
  );
}
