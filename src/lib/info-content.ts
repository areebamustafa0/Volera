export interface InfoBlock {
  heading?: string;
  body?: string;
  list?: string[];
}

export interface InfoPageContent {
  eyebrow: string;
  title: string;
  lede: string;
  blocks: InfoBlock[];
}

/** Editorial content for the customer-care and legal pages linked in the footer. */
export const INFO_PAGES: Record<string, InfoPageContent> = {
  contact: {
    eyebrow: "Customer Care",
    title: "Contact us",
    lede: "We answer every letter, usually within one business day.",
    blocks: [
      { heading: "Email", body: "hello@velorabooks.com — orders, accounts, and general correspondence." },
      { heading: "Press & partnerships", body: "press@velorabooks.com" },
      {
        heading: "The Reading Room",
        body: "12 Archive Lane, Portland, Oregon. Open Tuesday to Saturday, 10am–6pm. Coffee is on us.",
      },
      {
        heading: "Order enquiries",
        body: "Quote your order reference (the first eight characters shown on your confirmation) and we can help immediately.",
      },
    ],
  },
  faq: {
    eyebrow: "Customer Care",
    title: "Frequently asked questions",
    lede: "The things readers ask us most often.",
    blocks: [
      {
        heading: "How are eBooks delivered?",
        body: "Instantly. Once payment is confirmed, digital editions appear in My Library where you can read online or download them. They remain yours permanently.",
      },
      {
        heading: "What is your shipping policy?",
        body: "Physical orders ship within 1–2 business days. Shipping is complimentary on orders over $75; otherwise a flat rate of $5.99 applies.",
      },
      {
        heading: "What is your returns policy?",
        body: "Unread physical books may be returned within 14 days of delivery for a full refund. Digital editions are non-refundable once accessed, except where required by law.",
      },
      {
        heading: "Can I read on more than one device?",
        body: "Yes. Sign in anywhere and your library and reading position follow you — progress is stored on your account, not on a single device.",
      },
      {
        heading: "Do I need to verify my email?",
        body: "Yes. Verification protects your library and is required before checkout, downloads, and posting reviews.",
      },
    ],
  },
  shipping: {
    eyebrow: "Customer Care",
    title: "Shipping & returns",
    lede: "How your books travel, and what happens if something is not right.",
    blocks: [
      {
        heading: "Dispatch",
        body: "Orders are packed by hand in recyclable, book-safe materials and dispatched within 1–2 business days.",
      },
      {
        heading: "Rates",
        body: "Complimentary shipping on orders over $75. Below that, a flat $5.99 applies. Digital-only orders are never charged shipping.",
      },
      {
        heading: "Returns",
        body: "Unread physical books may be returned within 14 days of delivery. Email hello@velorabooks.com and we will arrange collection.",
      },
      {
        heading: "Damaged in transit",
        body: "If a book arrives damaged, send us a photograph within 7 days and we will replace it — no return required.",
      },
    ],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy policy",
    lede: "We collect only what is needed to run a bookshop, and we never sell your data.",
    blocks: [
      {
        heading: "What we hold",
        body: "Your account details, order history, and reading progress. Reading progress is private to you and is never shared or sold.",
      },
      {
        heading: "Cookies",
        body: "We use essential cookies for your session and shopping bag. A service worker caches page shells and cover images so the shop loads quickly — purchased eBook content is never cached.",
      },
      {
        heading: "Your library",
        body: "eBooks are delivered through short-lived signed links tied to your account. Files are stored privately and are never publicly addressable.",
      },
      {
        heading: "Your rights",
        body: "Write to hello@velorabooks.com to export or delete your data and we will action it promptly.",
      },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of service",
    lede: "The agreement between you and Velora Books, in plain language.",
    blocks: [
      {
        heading: "Purchases",
        body: "Digital editions are licensed for personal use by a single account. Physical editions are yours outright.",
      },
      {
        heading: "Accounts",
        body: "You are responsible for keeping your credentials secure. Passwords are hashed and never stored in readable form.",
      },
      {
        heading: "Payments",
        body: "All prices are confirmed by our servers at checkout. Payment status is verified with our payment provider before any order is fulfilled or library access granted.",
      },
      {
        heading: "Acceptable use",
        body: "Redistributing, reselling, or circumventing protection on digital editions ends the licence and may close the account.",
      },
    ],
  },
  careers: {
    eyebrow: "About",
    title: "Careers",
    lede: "We are a small team that cares disproportionately about typography, paper, and sentences.",
    blocks: [
      {
        heading: "How we work",
        body: "Deliberately. We would rather ship one considered thing than five rushed ones, and we read on company time because that is the job.",
      },
      {
        heading: "Open roles",
        body: "We have no openings at present. We do read every speculative letter, and we keep the good ones.",
      },
      {
        heading: "Get in touch",
        body: "Send a note and the last three books that changed your mind to careers@velorabooks.com.",
      },
    ],
  },
  "gift-cards": {
    eyebrow: "Shop",
    title: "Gift cards",
    lede: "The reliable pleasure of letting someone choose their own book.",
    blocks: [
      {
        heading: "Coming soon",
        body: "Velora gift cards are being finished now. They will be redeemable against both print and digital editions, will never expire, and will arrive as a properly typeset card rather than a receipt.",
      },
      {
        heading: "Be told first",
        body: "Subscribe to the Velora Gazette at the foot of any page and we will write to you the day they arrive.",
      },
    ],
  },
  sitemap: {
    eyebrow: "Navigation",
    title: "Sitemap",
    lede: "Everywhere you can go from here.",
    blocks: [
      { heading: "Shop", list: ["/shop", "/new-arrivals", "/bestsellers", "/collections", "/search"] },
      { heading: "Your account", list: ["/account/library", "/account/orders", "/account/wishlist", "/cart"] },
      { heading: "Read", list: ["/journal", "/about"] },
      { heading: "Customer care", list: ["/contact", "/faq", "/shipping", "/gift-cards"] },
      { heading: "Legal", list: ["/privacy", "/terms"] },
    ],
  },
};
