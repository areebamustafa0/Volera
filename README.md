# BookStore — Full-Stack Online Bookstore with Instant PDF eBooks

A production-quality online bookstore built with Next.js (App Router), TypeScript, PostgreSQL, and Drizzle ORM. Customers can browse physical books and eBooks, buy PDFs with instant secure delivery, read online, download purchased files, leave verified reviews, and manage their account — all backed by server-authoritative pricing, inventory, and access control.

## Demo Accounts

Seeded automatically by `npm run db:seed`.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@velorabooks.com` | `Admin123!` |
| Customer | `customer@velorabooks.com` | `Customer123!` |

Demo coupon: **VELORA10** (10% off orders over $20).

> This is demo/seed data for local development and evaluation — it is not real business information. Replace the seed script with your own catalog before deploying to production.

## Quick Start

```bash
git clone <your-repo-url>
cd <project-folder>
npm install

cp .env.example .env   # fill in DATABASE_URL at minimum
```

`AUTH_SECRET` and `CRON_SECRET` are auto-generated into `.env` the first time you run `npm run dev` or `npm run build` (see `scripts/ensure-secrets.mjs`) — there is no hardcoded fallback secret anywhere in the codebase.

**Apply the database schema (production-style migrations):**

```bash
npm run db:generate     # create versioned SQL under drizzle/
npm run db:migrate      # apply migrations deterministically
```

For fast local iteration only, you may instead run `npx drizzle-kit push` — never use `push` against a production database.

**Seed demo data and start:**

```bash
npm run db:seed
npm run build
npm start
```

Or for local development with hot reload:

```bash
npm run dev
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Route Handlers)
- **Language:** TypeScript (strict, zero `any` in application code)
- **Database:** PostgreSQL via Drizzle ORM (schema in `src/db/schema.ts`)
- **Auth:** Custom JWT session cookies + bcrypt password hashing
- **Payments:** Stripe Checkout + signature-verified webhooks
- **Validation:** Zod on every API boundary
- **Testing:** Vitest (unit) + Playwright (E2E)
- **Icons:** lucide-react

## Architecture Highlights

### Catalog & Search
- `/shop` uses SQL-level `EXISTS`/aggregate subqueries for format, price, rating, and stock filters — pagination happens in the database, not in application memory, so the full catalog is never loaded for a single page view.
- Filters: category, author, format (PDF/print), max price, minimum rating, in-stock only. Active filters render as removable chips with a "Clear all" action.
- Sorting: Newest, Best Selling, Highest Rated, Price (asc/desc), Title.
- `/search` matches title, author name, ISBN, category name, and description in one query, with a "no results" empty state and quick format filters.
- `/categories`, `/best-sellers`, and `/new-releases` are real, data-backed pages — not placeholder links.

### Cart & Checkout
- `POST/PATCH/DELETE /api/cart` — every mutation re-validates stock server-side (`stock − reservedStock`), is CSRF-guarded, and is scoped to the caller's own cart (no IDOR: a `PATCH`/`DELETE` for another user's cart item returns 404, not someone else's data).
- Digital (`EBOOK`) items can only ever exist once in a cart/library per user; physical items respect real-time inventory.
- Order totals (subtotal, discount, shipping, tax) are always recomputed server-side in `src/lib/pricing.ts` — client-submitted prices and totals are never trusted.

### Payments (Stripe)
- `POST /api/payments/create-checkout` — recomputes all prices from the database, validates stock & coupons, persists a **PENDING** order, then creates a Stripe Checkout Session.
- `POST /api/payments/webhook` — signature-verified (`stripe.webhooks.constructEvent`), idempotent. This is the **only** code path that can mark an order `PAID`.
- **No bypass, ever:** a missing `STRIPE_SECRET_KEY` returns **503 Payments Not Configured** in every environment — there is no simulated/test payment path that can silently mark an order as paid.
- **Idempotent checkout:** a fingerprint of (cart, line items, coupon) is passed to Stripe as an `idempotencyKey`, so rapid repeated clicks reuse the same session instead of creating duplicate orders.
- **Inventory reservation:** checkout atomically reserves units (`WHERE stock - reserved >= qty`) so two customers can't both check out the last copy; the hold is released if the session expires or fails, and converted to a real stock decrement on payment.
- Webhook validates payment context before fulfilling an order: session↔order match, paid amount equals the computed total, currency match, and `payment_status === "paid"`.
- If payment succeeds but stock disappeared in the meantime, the order is automatically cancelled and refunded rather than silently overselling.

### Digital Rights & Secure eBook Delivery
- eBook files are **never** stored under a public, guessable path. `GET /api/downloads/[bookId]` verifies authentication, ownership (a `libraries` row tied to a `PAID` order), and per-day download quota before issuing a short-lived **signed** URL from `GET /api/downloads/file`.
- Every download is logged (`downloads` table) with user, book, and timestamp for auditability.
- The online reader (`/reader/[bookId]`) performs the same ownership check server-side before rendering a single word of content — changing the URL's book ID does not expose another customer's purchase.
- Reading progress and preferences persist per user (`reader_bookmarks`, `reader_preferences`).

### Reviews
- Only customers with a `PAID` order containing the book can submit a review (`POST /api/reviews` checks `orders`/`order_items` server-side).
- Reviews start in `PENDING` and only appear publicly once an admin approves them.
- One review per user per book, enforced by a database unique constraint.
- The book detail page shows the real average rating, rating distribution, and a "Verified Purchase" badge — there is no fabricated review data.

### Inventory
- `book_formats.stock` and `reserved_stock` track real-time availability; the storefront never allows adding more to a cart than is actually available, and this is re-checked server-side on every cart mutation and at checkout.

### Account Area (`/account`)
- **Dashboard** — order/wishlist/library counts and recent orders.
- **Orders** — full history with expandable line items, status, and totals.
- **My Books & Downloads** (`/account/library`) — every purchased eBook with "Continue Reading" progress, secure "Read Online," and "Download PDF" actions.
- **Wishlist** — add/remove from any book card; persisted per logged-in user.
- **Addresses** — full CRUD with a single default address.
- **Profile** — update display name.
- **Security** — change password (requires current password), email verification status.

### Admin (`/admin`)
Every `/api/admin/*` handler re-checks `role === "ADMIN"` server-side (never trusts a client-supplied role) and is CSRF-guarded. Covers book/format/price/inventory management, order status updates, review moderation, and customer visibility, with an audit log of privileged mutations.

### Security Posture
- Passwords hashed with bcrypt; JWT session cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.
- CSRF protection (`src/lib/csrf.ts`) on all state-changing routes.
- Rate limiting (`src/lib/rate-limit.ts`) on auth, checkout, reviews, and download endpoints.
- No secret has a hardcoded fallback — `AUTH_SECRET` and friends throw loudly if unset in production rather than silently using an insecure default.
- SQL access goes exclusively through Drizzle's parameterized query builder — no raw string concatenation into SQL.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── (storefront pages: /, /shop, /books/[slug], /search, /categories, ...)
│   ├── account/          # Customer account area
│   ├── admin/            # Admin dashboard
│   ├── api/              # Route handlers (cart, orders, payments, reviews, ...)
│   └── reader/[bookId]/  # Secure online eBook reader
├── components/           # UI components grouped by domain
├── db/                   # Drizzle schema + seed script
├── lib/                  # Auth, pricing, validation, rate-limit, CSRF, secrets
└── services/             # Business logic (orders, downloads, inventory, audit)
```

## Testing

```bash
npm test          # Vitest unit tests
npm run test:e2e  # Playwright end-to-end tests
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Start the production server |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a new Drizzle migration |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo catalog, users, and eBook content |

## Deploying

1. Provision a PostgreSQL database and set `DATABASE_URL`.
2. Set `AUTH_SECRET` and `CRON_SECRET` as real environment variables in your hosting platform (don't rely on the auto-generation script in production).
3. Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` to accept real payments — without them, checkout is disabled by design rather than faked.
4. Run `npm run db:migrate` against the production database, then seed or import your real catalog.
5. `npm run build && npm start`.

## License

Add your license of choice here before publishing (e.g. MIT).
"# Volera" 
"# Volera" 
"# Volera" 
