CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" uuid,
	"admin_email" text NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text,
	"old_value" text,
	"new_value" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reader_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"chapter_number" integer NOT NULL,
	"scroll_ratio" numeric(5, 4) DEFAULT '0' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reader_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"font_size" integer DEFAULT 18 NOT NULL,
	"font_family" text DEFAULT 'serif' NOT NULL,
	"line_height" numeric(3, 2) DEFAULT '1.90' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "book_formats" ADD COLUMN "reserved_stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "book_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "author_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "line_subtotal" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency" text DEFAULT 'usd' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reservation_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_chapters" ADD CONSTRAINT "book_chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_bookmarks" ADD CONSTRAINT "reader_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_bookmarks" ADD CONSTRAINT "reader_bookmarks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_preferences" ADD CONSTRAINT "reader_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_resource" ON "admin_audit_logs" USING btree ("resource","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_chapter_book_number" ON "book_chapters" USING btree ("book_id","chapter_number");--> statement-breakpoint
CREATE INDEX "idx_chapters_book" ON "book_chapters" USING btree ("book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_login_attempts_identifier" ON "login_attempts" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_bookmark_user_book_chapter" ON "reader_bookmarks" USING btree ("user_id","book_id","chapter_number");--> statement-breakpoint
CREATE INDEX "idx_bookmarks_user_book" ON "reader_bookmarks" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_reader_prefs_user" ON "reader_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_formats_book" ON "book_formats" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_formats_book_format" ON "book_formats" USING btree ("book_id","format");--> statement-breakpoint
CREATE INDEX "idx_library_user" ON "libraries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_library_user_book" ON "libraries" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_orders_idempotency" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_reviews_book_status" ON "reviews" USING btree ("book_id","status");--> statement-breakpoint
CREATE INDEX "idx_wishlist_user" ON "wishlists" USING btree ("user_id");