import React from "react";
import Link from "next/link";

/**
 * Shared editorial page masthead: gold eyebrow, serif headline, lede, and an
 * optional breadcrumb. Keeps every catalog page visually consistent.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  breadcrumb,
  align = "left",
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  breadcrumb?: { label: string; href?: string }[];
  align?: "left" | "center";
}) {
  return (
    <header
      className={`border-b border-[#171513]/10 pb-10 mb-12 ${align === "center" ? "text-center" : ""}`}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex flex-wrap items-center gap-2 text-[11px] text-[#171513]/50">
            {breadcrumb.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                {c.href ? (
                  <Link href={c.href} className="hover:text-[#C8A96B] transition-colors">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-[#171513]/80">{c.label}</span>
                )}
                {i < breadcrumb.length - 1 && <span aria-hidden>/</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <p className="text-[11px] uppercase tracking-[0.3em] text-[#A88A55] font-semibold mb-3">
        {eyebrow}
      </p>
      <h1 className="font-serif text-4xl sm:text-5xl leading-[1.1] text-[#171513]">{title}</h1>
      {lede && (
        <p
          className={`mt-4 text-[15px] leading-relaxed text-[#171513]/65 font-light ${
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"
          }`}
        >
          {lede}
        </p>
      )}
    </header>
  );
}
