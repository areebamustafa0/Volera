"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

interface Props {
  allCategories: { id: number; slug: string; name: string }[];
  allAuthors: { id: number; slug: string; name: string }[];
  categorySlug: string;
  authorSlug: string;
  formatFilter: string;
  maxPrice?: string;
  minRating?: string;
  inStockOnly: boolean;
  query: string;
}

/** Bottom-sheet filter panel for small screens. */
export function MobileFilters({
  allCategories, allAuthors, categorySlug, authorSlug, formatFilter, maxPrice, minRating, inStockOnly, query,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    category: categorySlug, author: authorSlug, format: formatFilter,
    maxPrice: maxPrice ?? "", minRating: minRating ?? "", inStock: inStockOnly,
  });

  const activeCount = [categorySlug, authorSlug, formatFilter, maxPrice, minRating, inStockOnly ? "1" : ""].filter(Boolean).length;

  const apply = () => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (draft.category) p.set("category", draft.category);
    if (draft.author) p.set("author", draft.author);
    if (draft.format) p.set("format", draft.format);
    if (draft.maxPrice) p.set("maxPrice", draft.maxPrice);
    if (draft.minRating) p.set("minRating", draft.minRating);
    if (draft.inStock) p.set("inStock", "true");
    setOpen(false);
    router.push(`/shop?${p.toString()}`);
  };

  const clear = () => {
    setDraft({ category: "", author: "", format: "", maxPrice: "", minRating: "", inStock: false });
    setOpen(false);
    router.push(query ? `/shop?q=${encodeURIComponent(query)}` : "/shop");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-[#e2e8f0] text-[#475569] hover:border-[#1e3a5f] transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filters{activeCount > 0 && <span className="bg-[#1e3a5f] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">{activeCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filter books">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
              <h2 className="font-bold text-[#0f172a]">Filters</h2>
              <button onClick={() => setOpen(false)} aria-label="Close filters" className="p-1.5 rounded-lg hover:bg-[#f1f4f9]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <Section title="Format">
                <SegButtons
                  options={[{ label: "All", value: "" }, { label: "PDF", value: "ebook" }, { label: "Print", value: "physical" }]}
                  value={draft.format}
                  onChange={(v) => setDraft({ ...draft, format: v })}
                />
              </Section>

              <Section title="Category">
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm">
                  <option value="">All Categories</option>
                  {allCategories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
                </select>
              </Section>

              <Section title="Author">
                <select value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm">
                  <option value="">All Authors</option>
                  {allAuthors.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
                </select>
              </Section>

              <Section title="Max Price">
                <SegButtons
                  options={[{ label: "Any", value: "" }, { label: "$10", value: "10" }, { label: "$20", value: "20" }, { label: "$30", value: "30" }]}
                  value={draft.maxPrice}
                  onChange={(v) => setDraft({ ...draft, maxPrice: v })}
                />
              </Section>

              <Section title="Rating">
                <SegButtons
                  options={[{ label: "Any", value: "" }, { label: "3★+", value: "3" }, { label: "4★+", value: "4" }]}
                  value={draft.minRating}
                  onChange={(v) => setDraft({ ...draft, minRating: v })}
                />
              </Section>

              <label className="flex items-center gap-2.5 text-sm text-[#0f172a] font-medium">
                <input type="checkbox" checked={draft.inStock} onChange={(e) => setDraft({ ...draft, inStock: e.target.checked })} className="w-4 h-4 rounded accent-[#1e3a5f]" />
                In stock only
              </label>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#e2e8f0] p-4 flex gap-3">
              <button onClick={clear} className="flex-1 border border-[#e2e8f0] text-[#475569] py-3 rounded-xl font-semibold text-sm">Clear All</button>
              <button onClick={apply} className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold text-sm">Apply Filters</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#94a3b8] font-semibold mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function SegButtons({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            value === o.value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "border-[#e2e8f0] text-[#475569]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
