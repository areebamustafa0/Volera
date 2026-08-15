import React from "react";
import Link from "next/link";
import { BookOpen, Mail, Phone, MapPin, Globe } from "lucide-react";

const LINKS = {
  Shop: [
    { href: "/shop", label: "All Books" },
    { href: "/shop?format=ebook", label: "PDF eBooks" },
    { href: "/shop?format=physical", label: "Print Books" },
    { href: "/shop?sort=newest", label: "New Arrivals" },
    { href: "/gift-cards", label: "Gift Cards" },
  ],
  "My Account": [
    { href: "/auth/login", label: "Sign In" },
    { href: "/auth/register", label: "Create Account" },
    { href: "/account/library", label: "My Books" },
    { href: "/cart", label: "Shopping Cart" },
  ],
  Help: [
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact Us" },
    { href: "/shipping", label: "Shipping & Returns" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/sitemap", label: "Sitemap" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#0f172a] text-[#94a3b8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid gap-10 md:grid-cols-[200px_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#2d5a9e] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg text-white">BookStore</span>
            </Link>
            <p className="text-sm leading-relaxed mb-5 max-w-[180px]">
              Buy books online with instant PDF access on all eBooks.
            </p>
            <div className="space-y-2 text-sm">
              <a href="mailto:support@bookstore.com" className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Mail className="w-4 h-4 shrink-0" /> support@bookstore.com
              </a>
              <a href="tel:+15550102030" className="flex items-center gap-2.5 hover:text-white transition-colors">
                <Phone className="w-4 h-4 shrink-0" /> +1 (555) 010-2030
              </a>
              <span className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 shrink-0" /> Portland, Oregon
              </span>
            </div>
            <div className="flex gap-3 mt-5">
              {[
                { href: "#", icon: Globe, label: "Website" },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {Object.entries(LINKS).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
                <ul className="space-y-2.5">
                  {links.map((l) => (
                    <li key={l.label + l.href}>
                      <Link href={l.href} className="text-sm hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} BookStore. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">🔒 SSL Secured</span>
            <span className="flex items-center gap-1.5">⚡ Instant PDF delivery</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
