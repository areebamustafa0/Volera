import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: { default: "BookStore — Buy Books Online, Instant PDF Access", template: "%s | BookStore" },
  description: "Shop physical books and eBooks with instant PDF access. Browse fiction, romance, fantasy, business, technology, self-development and more.",
  openGraph: { siteName: "BookStore", type: "website" },
  manifest: "/manifest.json",
  icons: { icon: "/icon.png" },
  applicationName: "BookStore",
};

export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-screen antialiased" style={{ fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)" }}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[999] focus:bg-brand focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
