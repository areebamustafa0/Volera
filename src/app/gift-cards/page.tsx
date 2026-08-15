import type { Metadata } from "next";
import { InfoPage } from "@/components/layout/InfoPage";
import { INFO_PAGES } from "@/lib/info-content";

const SLUG = "gift-cards";

export const metadata: Metadata = {
  title: INFO_PAGES[SLUG].title,
  description: INFO_PAGES[SLUG].lede,
};

export default function Page() {
  return <InfoPage slug={SLUG} />;
}
