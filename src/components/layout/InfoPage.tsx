import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewsletterSignup } from "@/components/layout/NewsletterSignup";
import { getCurrentUser } from "@/lib/auth";
import { INFO_PAGES } from "@/lib/info-content";

/** Shared renderer for every customer-care and legal page. */
export async function InfoPage({ slug }: { slug: keyof typeof INFO_PAGES | string }) {
  const content = INFO_PAGES[slug];
  if (!content) notFound();

  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#171513]">
      <Navbar user={user} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <PageHeader
          eyebrow={content.eyebrow}
          title={content.title}
          lede={content.lede}
          breadcrumb={[{ label: "Home", href: "/" }, { label: content.title }]}
        />

        <div className="space-y-9">
          {content.blocks.map((block, i) => (
            <section key={i}>
              {block.heading && (
                <h2 className="font-serif text-xl mb-2 text-[#171513]">{block.heading}</h2>
              )}
              {block.body && (
                <p className="text-[15px] leading-relaxed text-[#171513]/70 font-light">
                  {block.body}
                </p>
              )}
              {block.list && (
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                  {block.list.map((href) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-[#171513]/70 hover:text-[#C8A96B] underline underline-offset-4 decoration-[#171513]/20 transition-colors"
                      >
                        {href}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-16 pt-10 border-t border-[#171513]/10">
          <h2 className="font-serif text-2xl mb-2">Letters for people who love books.</h2>
          <p className="text-sm text-[#171513]/60 font-light mb-5">
            Curated recommendations and private editorial drops. No noise.
          </p>
          <NewsletterSignup />
        </div>
      </main>

      <Footer />
    </div>
  );
}
