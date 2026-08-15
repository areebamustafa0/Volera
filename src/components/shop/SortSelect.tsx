"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

const OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "best-selling", label: "Best Selling" },
  { value: "rating", label: "Highest Rated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "title", label: "Title: A to Z" },
];

/**
 * Client island for catalog sorting. Kept separate so the shop page itself
 * remains a Server Component (event handlers cannot cross that boundary).
 */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasQuery = Boolean(searchParams.get("q"));

  return (
    <div className="relative">
      <ArrowUpDown className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={value}
        aria-label="Sort books"
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", e.target.value);
          params.delete("page");
          router.push(`/shop?${params.toString()}`);
        }}
        className="appearance-none bg-white border border-[#e2e8f0] text-sm rounded-lg pl-8 pr-8 py-2.5 font-medium text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/20 focus:border-[#2d5a9e] cursor-pointer"
      >
        {hasQuery && <option value="relevance">Relevance</option>}
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
