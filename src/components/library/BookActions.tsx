"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Download, BookOpen, Loader2, Check } from "lucide-react";

/** Read-online + secure PDF download for a book the user owns. */
export function BookActions({ bookId }: { bookId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const download = async () => {
    setState("loading");
    setMessage("");
    try {
      const res = await fetch(`/api/downloads/${bookId}`);
      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setMessage(data.error || "Download unavailable");
        return;
      }

      // Server returns a short-lived signed URL; trigger the browser download.
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setState("done");
      setMessage(
        typeof data.downloadsRemaining === "number"
          ? `${data.downloadsRemaining} downloads left today`
          : ""
      );
      setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
      setMessage("Download failed. Please try again.");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Link
          href={`/reader/${bookId}`}
          className="flex-1 bg-blue-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors inline-flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Read Online
        </Link>

        <button
          onClick={download}
          disabled={state === "loading"}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 border-2 ${
            state === "done"
              ? "border-green-600 text-green-700 bg-green-50"
              : "border-blue-900 text-blue-900 hover:bg-blue-50"
          } disabled:opacity-60`}
        >
          {state === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : state === "done" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {state === "done" ? "Downloaded" : "Download PDF"}
        </button>
      </div>

      {message && (
        <p className={`text-xs ${state === "error" ? "text-red-600" : "text-gray-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
