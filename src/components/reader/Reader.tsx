"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronLeft, ChevronRight, List, Minus, Plus, X, Download, Loader2, Check,
} from "lucide-react";

export interface Chapter {
  number: number;
  title: string;
  paragraphs: string[];
}
export interface ChapterRef {
  number: number;
  title: string;
}

type Theme = "light" | "sepia" | "dark";
const THEMES: Record<Theme, { bg: string; text: string; panel: string }> = {
  light: { bg: "#ffffff", text: "#1f2937", panel: "#f9fafb" },
  sepia: { bg: "#f5ecd9", text: "#4b3a26", panel: "#efe3cb" },
  dark: { bg: "#1a1a1a", text: "#e5e5e5", panel: "#262626" },
};

export function Reader({
  bookId,
  bookTitle,
  authorName,
  chapterList,
  initialChapter,
  initialProgress,
}: {
  bookId: number;
  bookTitle: string;
  authorName: string;
  chapterList: ChapterRef[];
  initialChapter: Chapter;
  initialProgress: number;
}) {
  const [chapter, setChapter] = useState<Chapter>(initialChapter);
  const [loading, setLoading] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<Theme>("light");
  const [tocOpen, setTocOpen] = useState(false);
  const [progress, setProgress] = useState(initialProgress);
  const [downloading, setDownloading] = useState<"idle" | "loading" | "done">("idle");

  const scrollRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef(0);
  const dirtyRef = useRef(false);
  const cache = useRef(new Map<number, Chapter>([[initialChapter.number, initialChapter]]));

  const total = chapterList.length;
  const index = Math.max(0, chapterList.findIndex((c) => c.number === chapter.number));
  const t = THEMES[theme];

  const save = useCallback(
    async (chNum: number, ratio: number) => {
      const res = await fetch("/api/reader/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterNumber: chNum, scrollRatio: Number(ratio.toFixed(3)) }),
      }).catch(() => null);
      if (res?.ok) {
        const d = await res.json();
        if (typeof d.progressPercentage === "number") setProgress(d.progressPercentage);
      }
    },
    [bookId]
  );

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    ratioRef.current = max > 0 ? Math.min(el.scrollTop / max, 1) : 1;
    dirtyRef.current = true;
  };

  // Autosave every 6s while reading
  useEffect(() => {
    const id = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        save(chapter.number, ratioRef.current);
      }
    }, 6000);
    return () => clearInterval(id);
  }, [chapter.number, save]);

  const goTo = async (num: number) => {
    if (num < 1 || num > total) return;
    setTocOpen(false);

    const cached = cache.current.get(num);
    if (cached) {
      setChapter(cached);
    } else {
      setLoading(true);
      const res = await fetch(`/api/reader/chapter?bookId=${bookId}&chapter=${num}`);
      if (res.ok) {
        const { chapter: fetched } = await res.json();
        cache.current.set(num, fetched);
        setChapter(fetched);
      }
      setLoading(false);
    }
    ratioRef.current = 0;
    scrollRef.current?.scrollTo({ top: 0 });
    save(num, 0);
  };

  const downloadPdf = async () => {
    setDownloading("loading");
    const res = await fetch(`/api/downloads/${bookId}`);
    if (res.ok) {
      const data = await res.json();
      const a = document.createElement("a");
      a.href = data.downloadUrl;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDownloading("done");
      setTimeout(() => setDownloading("idle"), 3000);
    } else {
      setDownloading("idle");
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: t.bg, color: t.text }}>
      {/* Toolbar */}
      <header
        className="border-b flex items-center justify-between px-4 py-3 shrink-0"
        style={{ backgroundColor: t.panel, borderColor: "rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/account/library" className="p-1.5 hover:opacity-70" aria-label="Back to My Books">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm truncate">{bookTitle}</h1>
            <p className="text-xs opacity-60 truncate">{authorName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setTocOpen(true)} className="p-2 hover:opacity-70" aria-label="Contents" title="Contents">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setFontSize((s) => Math.max(14, s - 2))} className="p-2 hover:opacity-70" aria-label="Smaller text">
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xs w-6 text-center tabular-nums">{fontSize}</span>
          <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="p-2 hover:opacity-70" aria-label="Larger text">
            <Plus className="w-4 h-4" />
          </button>

          {(["light", "sepia", "dark"] as Theme[]).map((th) => (
            <button
              key={th}
              onClick={() => setTheme(th)}
              aria-label={`${th} mode`}
              title={`${th} mode`}
              className={`w-6 h-6 rounded-full border-2 ${theme === th ? "border-blue-600" : "border-gray-300"}`}
              style={{ backgroundColor: THEMES[th].bg }}
            />
          ))}

          <button
            onClick={downloadPdf}
            disabled={downloading === "loading"}
            className="ml-2 flex items-center gap-1.5 bg-blue-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-800 disabled:opacity-60"
          >
            {downloading === "loading" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : downloading === "done" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            PDF
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="h-1 bg-black/10 shrink-0">
        <div className="h-full bg-blue-700 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Contents */}
        {tocOpen && (
          <aside className="w-72 border-r overflow-y-auto p-5 shrink-0" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm">Contents</h2>
              <button onClick={() => setTocOpen(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-1">
              {chapterList.map((c) => (
                <li key={c.number}>
                  <button
                    onClick={() => goTo(c.number)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      c.number === chapter.number ? "bg-blue-900 text-white font-semibold" : "hover:bg-black/5"
                    }`}
                  >
                    {c.number}. {c.title}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        )}

        {/* Page */}
        <main ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
          <article className="max-w-2xl mx-auto px-6 py-12" style={{ fontSize, lineHeight: 1.85 }}>
            <p className="text-xs uppercase tracking-widest opacity-50 mb-2">
              Chapter {chapter.number} of {total}
            </p>
            <h2 className="text-2xl font-bold mb-8" style={{ fontSize: fontSize + 10 }}>
              {chapter.title}
            </h2>

            {loading ? (
              <div className="flex items-center gap-2 opacity-60 py-12">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading chapter…
              </div>
            ) : (
              chapter.paragraphs.map((p, i) => (
                <p key={i} className="mb-5">
                  {p}
                </p>
              ))
            )}

            <div
              className="mt-12 pt-6 border-t flex items-center justify-between"
              style={{ borderColor: "rgba(0,0,0,0.1)" }}
            >
              <button
                onClick={() => goTo(chapter.number - 1)}
                disabled={index === 0 || loading}
                className="inline-flex items-center gap-1.5 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-xs opacity-50">{progress}% read</span>
              <button
                onClick={() => goTo(chapter.number + 1)}
                disabled={index >= total - 1 || loading}
                className="inline-flex items-center gap-1.5 bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-30"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {index === total - 1 && (
              <p className="mt-8 text-center opacity-60 italic">The End — thanks for reading.</p>
            )}
          </article>
        </main>
      </div>
    </div>
  );
}
