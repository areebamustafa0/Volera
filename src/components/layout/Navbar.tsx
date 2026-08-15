"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search, ShoppingCart, User, Menu, X, BookOpen, LogOut,
  LayoutDashboard, Library, Heart, TrendingUp, Sparkles, Grid3x3,
} from "lucide-react";

const CATEGORIES = [
  { slug: "fiction", label: "Fiction" },
  { slug: "romance", label: "Romance" },
  { slug: "mystery", label: "Mystery" },
  { slug: "fantasy", label: "Fantasy" },
  { slug: "science-fiction", label: "Sci-Fi" },
  { slug: "business", label: "Business" },
  { slug: "self-development", label: "Self Help" },
  { slug: "technology", label: "Technology" },
  { slug: "history", label: "History" },
];

export function Navbar({
  user = null,
  cartCount = 0,
  wishlistCount = 0,
}: {
  user?: { name: string; role: string } | null;
  cartCount?: number;
  wishlistCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  };

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-[#1e3a5f] text-white text-xs text-center py-2 px-4 font-medium tracking-wide">
        📚 Instant PDF download on all eBooks
      </div>

      <header
        className={`sticky top-0 z-50 bg-white border-b transition-shadow duration-200 ${
          scrolled ? "shadow-md border-transparent" : "border-[#e2e8f0]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-2" aria-label="BookStore home">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a5f] flex items-center justify-center">
                <BookOpen className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block leading-none">
                <div className="font-bold text-[15px] text-[#0f172a] tracking-tight">BookStore</div>
                <div className="text-[10px] text-[#94a3b8] font-medium mt-0.5">Read Anything</div>
              </div>
            </Link>

            {/* Desktop primary nav */}
            <nav className="hidden lg:flex items-center gap-1 mr-2" aria-label="Primary">
              <Link href="/shop" className="px-3 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] transition-colors">
                Books
              </Link>
              <Link href="/categories" className="px-3 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] transition-colors">
                Categories
              </Link>
              <Link href="/shop?format=ebook" className="px-3 py-2 rounded-lg text-sm font-medium text-[#059669] hover:bg-[#f0fdf4] transition-colors">
                eBooks
              </Link>
              <Link href="/best-sellers" className="px-3 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] transition-colors">
                Best Sellers
              </Link>
              <Link href="/new-releases" className="px-3 py-2 rounded-lg text-sm font-medium text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] transition-colors">
                New Releases
              </Link>
            </nav>

            {/* Search */}
            <form onSubmit={submitSearch} role="search" className="flex-1 hidden md:flex max-w-xl ml-auto">
              <div className="flex w-full rounded-lg border border-[#e2e8f0] focus-within:border-[#2d5a9e] focus-within:ring-2 focus-within:ring-[#2d5a9e]/20 bg-[#f8f9fc] overflow-hidden transition-all">
                <span className="pl-3.5 flex items-center text-[#94a3b8]">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, author, or ISBN…"
                  className="flex-1 px-2.5 py-2.5 text-sm bg-transparent outline-none placeholder:text-[#94a3b8] text-[#0f172a]"
                  aria-label="Search by title, author, or ISBN"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                    className="px-2 text-[#94a3b8] hover:text-[#475569]"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 bg-[#1e3a5f] text-white hover:bg-[#132644] transition-colors text-sm font-medium"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-0.5 ml-auto md:ml-2">
              {user ? (
                <div className="hidden md:flex items-center gap-0.5">
                  <Link
                    href="/account/library"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] font-medium transition-colors"
                  >
                    <Library className="w-4 h-4" />
                    My Books
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] font-medium transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  Login
                </Link>
              )}

              {/* Wishlist */}
              <Link
                href={user ? "/account/wishlist" : "/auth/login?redirect=/account/wishlist"}
                aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ""}`}
                className="relative p-2.5 rounded-lg text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] transition-colors"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#dc2626] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
                className="relative p-2.5 rounded-lg text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9] transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#e07b39] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2.5 rounded-lg text-[#475569] hover:bg-[#f1f4f9] transition-colors"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={submitSearch} role="search" className="md:hidden pb-3 flex gap-2">
            <div className="flex flex-1 rounded-lg border border-[#e2e8f0] focus-within:border-[#2d5a9e] focus-within:ring-2 focus-within:ring-[#2d5a9e]/20 overflow-hidden bg-[#f8f9fc] transition-all">
              <span className="pl-3 flex items-center text-[#94a3b8]"><Search className="w-4 h-4" /></span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books, authors, ISBN…"
                className="flex-1 px-2.5 py-2.5 text-sm bg-transparent outline-none placeholder:text-[#94a3b8]"
                aria-label="Search by title, author, or ISBN"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="px-2 text-[#94a3b8]" aria-label="Clear search">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button type="submit" className="px-4 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium">
              Go
            </button>
          </form>
        </div>

        {/* Category nav — desktop */}
        <nav className="hidden md:block bg-[#f8f9fc] border-t border-[#e2e8f0]" aria-label="Browse categories">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 h-10 overflow-x-auto no-scroll">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  href={`/shop?category=${c.slug}`}
                  className="px-3 py-1.5 text-xs text-[#475569] hover:text-[#1e3a5f] hover:bg-[#e2e8f0] rounded-md whitespace-nowrap transition-colors"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-2xl lg:hidden flex flex-col"
            aria-label="Mobile menu"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#e2e8f0]">
              <span className="font-bold text-[#0f172a]">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-[#f1f4f9]" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-1">
              <MobileLink href="/shop" label="All Books" icon={<BookOpen className="w-4 h-4" />} />
              <MobileLink href="/categories" label="Categories" icon={<Grid3x3 className="w-4 h-4" />} />
              <MobileLink href="/shop?format=ebook" label="PDF eBooks" icon={<Sparkles className="w-4 h-4" />} highlight />
              <MobileLink href="/best-sellers" label="Best Sellers" icon={<TrendingUp className="w-4 h-4" />} />
              <MobileLink href="/new-releases" label="New Releases" icon={<Sparkles className="w-4 h-4" />} />

              <div className="pt-3 pb-1">
                <p className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-semibold px-3 mb-1">Categories</p>
              </div>
              {CATEGORIES.map((c) => (
                <MobileLink key={c.slug} href={`/shop?category=${c.slug}`} label={c.label} />
              ))}

              <div className="border-t border-[#e2e8f0] pt-4 mt-4 space-y-1">
                <MobileLink
                  href={user ? "/account/wishlist" : "/auth/login?redirect=/account/wishlist"}
                  label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ""}`}
                  icon={<Heart className="w-4 h-4" />}
                />
                {user ? (
                  <>
                    <MobileLink href="/account" label="My Account" icon={<User className="w-4 h-4" />} />
                    <MobileLink href="/account/library" label="My Books" icon={<Library className="w-4 h-4" />} />
                    {user.role === "ADMIN" && (
                      <MobileLink href="/admin" label="Admin" icon={<LayoutDashboard className="w-4 h-4" />} />
                    )}
                    <button
                      onClick={logout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <MobileLink href="/auth/login" label="Login" icon={<User className="w-4 h-4" />} />
                    <Link
                      href="/auth/register"
                      className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-[#1e3a5f] text-white text-sm font-semibold mt-2"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        </>
      )}
    </>
  );
}

function MobileLink({
  href,
  label,
  icon,
  highlight,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        highlight
          ? "text-[#059669] bg-[#f0fdf4] hover:bg-[#dcfce7]"
          : "text-[#475569] hover:text-[#1e3a5f] hover:bg-[#f1f4f9]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
