"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Heart, Library, MapPin, User, ShieldCheck } from "lucide-react";

const LINKS = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/library", label: "My Books & Downloads", icon: Library },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account navigation" className="bg-white rounded-xl border border-[#e2e8f0] p-2 lg:sticky lg:top-24">
      <ul className="flex lg:flex-col gap-1 overflow-x-auto no-scroll">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-[#1e3a5f] text-white" : "text-[#475569] hover:bg-[#f1f4f9] hover:text-[#0f172a]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
