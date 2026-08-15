import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  numeric,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["CUSTOMER", "ADMIN"] }).default("CUSTOMER").notNull(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_categories_slug").on(t.slug)]
);

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    isbn: text("isbn").notNull().unique(),
    publisher: text("publisher").notNull(),
    authorId: integer("author_id").references(() => authors.id, { onDelete: "cascade" }).notNull(),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
    collectionId: integer("collection_id").references(() => collections.id, { onDelete: "set null" }),
    coverImage: text("cover_image").notNull(),
    publicationDate: text("publication_date").notNull(),
    language: text("language").default("English").notNull(),
    pages: integer("pages").notNull(),
    rating: numeric("rating", { precision: 3, scale: 2 }).default("4.80").notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isBestseller: boolean("is_bestseller").default(false).notNull(),
    isNewArrival: boolean("is_new_arrival").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_books_title").on(t.title),
    index("idx_books_bestseller").on(t.isBestseller),
    index("idx_books_new").on(t.isNewArrival),
    index("idx_books_category").on(t.categoryId),
  ]
);

// A book supports PHYSICAL / DIGITAL / BOTH by having one row per format here.
export const bookFormats = pgTable("book_formats", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
  format: text("format", { enum: ["HARDCOVER", "PAPERBACK", "EBOOK"] }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(50).notNull(),
  // Held for in-flight checkouts; released on expiry/cancel, consumed on PAID.
  reservedStock: integer("reserved_stock").default(0).notNull(),
  weight: text("weight"),
  fileKey: text("file_key"),
  fileSize: text("file_size"),
  fileType: text("file_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("idx_formats_book").on(t.bookId), index("idx_formats_book_format").on(t.bookId, t.format)]);

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
  formatId: integer("format_id").references(() => bookFormats.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status", {
      enum: ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"],
    })
      .default("PENDING")
      .notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    subtotalAmount: numeric("subtotal_amount", { precision: 10, scale: 2 }).notNull(),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    shippingAmount: numeric("shipping_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
    // Historical JSON snapshot of the delivery address at time of purchase.
    shippingAddress: text("shipping_address"),
    currency: text("currency").default("usd").notNull(),
    couponId: integer("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    stripeSessionId: text("stripe_session_id"),
    paymentIntentId: text("payment_intent_id"),
    paymentStatus: text("payment_status").default("PENDING").notNull(),
    // Prevents duplicate orders from rapid repeated checkout clicks.
    idempotencyKey: text("idempotency_key"),
    reservationExpiresAt: timestamp("reservation_expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_orders_stripe_session").on(t.stripeSessionId),
    index("idx_orders_user").on(t.userId),
    index("idx_orders_status").on(t.status),
    index("idx_orders_created").on(t.createdAt),
    uniqueIndex("uq_orders_idempotency").on(t.idempotencyKey),
  ]
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }),
  formatId: integer("format_id").references(() => bookFormats.id, { onDelete: "set null" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  formatName: text("format_name").notNull(),
  // Immutable snapshots — historical orders never re-read the books table.
  bookTitle: text("book_title").notNull().default(""),
  authorName: text("author_name").notNull().default(""),
  lineSubtotal: numeric("line_subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wishlists = pgTable(
  "wishlists",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_wishlist_user_book").on(t.userId, t.bookId), index("idx_wishlist_user").on(t.userId)]
);

// Digital entitlements: one row per purchased FORMAT, so buying a hardcover
// does NOT grant the eBook. Access requires format = EBOOK + order PAID.
export const libraries = pgTable(
  "libraries",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
    formatId: integer("format_id").references(() => bookFormats.id, { onDelete: "cascade" }),
    purchaseOrderId: uuid("purchase_order_id").references(() => orders.id, { onDelete: "set null" }),
    progressPercentage: integer("progress_percentage").default(0).notNull(),
    currentChapter: text("current_chapter").default("Chapter One"),
    lastReadPosition: text("last_read_position"),
    bookmarked: boolean("bookmarked").default(false).notNull(),
    status: text("status", { enum: ["READING", "FINISHED"] }).default("READING").notNull(),
    isFavorite: boolean("is_favorite").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_library_user_book_format").on(t.userId, t.bookId, t.formatId),
    index("idx_library_user").on(t.userId),
    index("idx_library_user_book").on(t.userId, t.bookId),
  ]
);

export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Real eBook content. Chapters are stored per-book and served ONLY after the
 * reader/download endpoints verify an EBOOK entitlement on a PAID order.
 */
export const bookChapters = pgTable(
  "book_chapters",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
    chapterNumber: integer("chapter_number").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(), // paragraphs separated by \n\n
    wordCount: integer("word_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_chapter_book_number").on(t.bookId, t.chapterNumber),
    index("idx_chapters_book").on(t.bookId),
  ]
);

/** Positional bookmarks (chapter + offset), not a single boolean. */
export const readerBookmarks = pgTable(
  "reader_bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
    chapterNumber: integer("chapter_number").notNull(),
    scrollRatio: numeric("scroll_ratio", { precision: 5, scale: 4 }).default("0").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_bookmark_user_book_chapter").on(t.userId, t.bookId, t.chapterNumber),
    index("idx_bookmarks_user_book").on(t.userId, t.bookId),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
    rating: integer("rating").notNull(),
    title: text("title").notNull(),
    comment: text("comment").notNull(),
    status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED"] }).default("PENDING").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_review_user_book").on(t.userId, t.bookId),
    index("idx_reviews_book_status").on(t.bookId, t.status),
  ]
);

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fullName: text("full_name").notNull(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  phone: text("phone").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: integer("discount_percent"),
  fixedAmount: numeric("fixed_amount", { precision: 10, scale: 2 }),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }).default("0.00"),
  maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Per-identifier failed-login tracking for progressive lockout. */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    identifier: text("identifier").notNull(), // "email:x" or "ip:y"
    failedCount: integer("failed_count").default(0).notNull(),
    lockedUntil: timestamp("locked_until"),
    lastAttemptAt: timestamp("last_attempt_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_login_attempts_identifier").on(t.identifier)]
);

/** Persisted reader settings so the reader reopens exactly as left. */
export const readerPreferences = pgTable(
  "reader_preferences",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    theme: text("theme", { enum: ["light", "dark", "sepia"] }).default("light").notNull(),
    fontSize: integer("font_size").default(18).notNull(),
    fontFamily: text("font_family").default("serif").notNull(),
    lineHeight: numeric("line_height", { precision: 3, scale: 2 }).default("1.90").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("uq_reader_prefs_user").on(t.userId)]
);

/** Immutable trail of every privileged mutation. */
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    adminId: uuid("admin_id").references(() => users.id, { onDelete: "set null" }),
    adminEmail: text("admin_email").notNull(),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_created").on(t.createdAt),
    index("idx_audit_resource").on(t.resource, t.resourceId),
  ]
);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  confirmed: boolean("confirmed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image").notNull(),
  authorName: text("author_name").notNull(),
  readTime: text("read_time").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Drizzle relations ──────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  reviews: many(reviews),
  library: many(libraries),
  wishlist: many(wishlists),
  addresses: many(addresses),
  downloads: many(downloads),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  author: one(authors, { fields: [books.authorId], references: [authors.id] }),
  category: one(categories, { fields: [books.categoryId], references: [categories.id] }),
  collection: one(collections, { fields: [books.collectionId], references: [collections.id] }),
  formats: many(bookFormats),
  reviews: many(reviews),
}));

export const bookFormatsRelations = relations(bookFormats, ({ one }) => ({
  book: one(books, { fields: [bookFormats.bookId], references: [books.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  book: one(books, { fields: [orderItems.bookId], references: [books.id] }),
  format: one(bookFormats, { fields: [orderItems.formatId], references: [bookFormats.id] }),
}));

export const bookChaptersRelations = relations(bookChapters, ({ one }) => ({
  book: one(books, { fields: [bookChapters.bookId], references: [books.id] }),
}));

export const readerBookmarksRelations = relations(readerBookmarks, ({ one }) => ({
  user: one(users, { fields: [readerBookmarks.userId], references: [users.id] }),
  book: one(books, { fields: [readerBookmarks.bookId], references: [books.id] }),
}));

export const librariesRelations = relations(libraries, ({ one }) => ({
  user: one(users, { fields: [libraries.userId], references: [users.id] }),
  book: one(books, { fields: [libraries.bookId], references: [books.id] }),
  format: one(bookFormats, { fields: [libraries.formatId], references: [bookFormats.id] }),
  order: one(orders, { fields: [libraries.purchaseOrderId], references: [orders.id] }),
}));
