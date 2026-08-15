import { NextResponse } from "next/server";
import { db } from "@/db";
import { books, bookFormats, authors, categories, orders, orderItems, users, reviews, coupons } from "@/db/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import {
  bookCreateSchema,
  orderStatusSchema,
  reviewModerationSchema,
  couponCreateSchema,
  stockUpdateSchema,
} from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";
import { captureException } from "@/lib/monitoring";
import { recordAudit, listAuditLogs } from "@/services/audit.service";
import { csrfGuard } from "@/lib/csrf";

type Resource = "books" | "orders" | "customers" | "reviews" | "coupons" | "audit";

async function requireAdmin(_request?: Request) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (user.role !== "ADMIN") return { error: NextResponse.json({ error: "Admin privileges required" }, { status: 403 }) };
  return { user };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;
  const { resource } = await params;

  switch (resource as Resource) {
    case "books": {
      const rows = await db
        .select({
          id: books.id,
          title: books.title,
          slug: books.slug,
          isbn: books.isbn,
          rating: books.rating,
          isFeatured: books.isFeatured,
          isBestseller: books.isBestseller,
          isNewArrival: books.isNewArrival,
          authorName: authors.name,
          categoryName: categories.name,
        })
        .from(books)
        .innerJoin(authors, eq(books.authorId, authors.id))
        .innerJoin(categories, eq(books.categoryId, categories.id))
        .orderBy(desc(books.createdAt));
      const formats = await db.select().from(bookFormats);
      const withFormats = rows.map((r) => ({
        ...r,
        formats: formats.filter((f) => f.bookId === r.id),
      }));
      return NextResponse.json({ books: withFormats });
    }
    case "orders": {
      const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
      const items = await db.select().from(orderItems);
      const customerIds = rows.map((r) => r.userId).filter(Boolean) as string[];
      const customerRows = customerIds.length
        ? await db.select({ id: users.id, email: users.email, name: users.name }).from(users)
        : [];
      return NextResponse.json({
        orders: rows.map((o) => ({
          ...o,
          itemCount: items.filter((i) => i.orderId === o.id).reduce((a, i) => a + i.quantity, 0),
          customer: customerRows.find((c) => c.id === o.userId) ?? null,
        })),
      });
    }
    case "customers": {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          orderCount: sql<number>`(select count(*) from orders where orders.user_id = ${users.id})`,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      return NextResponse.json({ customers: rows });
    }
    case "reviews": {
      const rows = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          title: reviews.title,
          comment: reviews.comment,
          status: reviews.status,
          createdAt: reviews.createdAt,
          userName: sql<string>`u.name`,
          bookTitle: sql<string>`b.title`,
        })
        .from(reviews)
        .innerJoin(sql`users u`, sql`u.id = ${reviews.userId}`)
        .innerJoin(sql`books b`, sql`b.id = ${reviews.bookId}`)
        .orderBy(desc(reviews.createdAt));
      return NextResponse.json({ reviews: rows });
    }
    case "coupons": {
      const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
      return NextResponse.json({ coupons: rows });
    }
    case "audit": {
      return NextResponse.json({ logs: await listAuditLogs(200) });
    }
    default:
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const rl = rateLimit(`admin:${clientKey(request)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;
  const { resource } = await params;
  const body = await request.json().catch(() => null);

  try {
    switch (resource as Resource) {
      case "books": {
        const parsed = bookCreateSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        const d = parsed.data;
        let slug = slugify(d.title);
        const [dup] = await db.select().from(books).where(eq(books.slug, slug)).limit(1);
        if (dup) slug = `${slug}-${Date.now().toString(36)}`;

        const [book] = await db
          .insert(books)
          .values({
            title: d.title,
            slug,
            description: d.description,
            isbn: d.isbn,
            publisher: d.publisher,
            authorId: d.authorId,
            categoryId: d.categoryId,
            coverImage: d.coverImage,
            publicationDate: d.publicationDate,
            pages: d.pages,
            language: d.language,
            isFeatured: d.isFeatured,
            isBestseller: d.isBestseller,
            isNewArrival: d.isNewArrival,
          })
          .returning();

        const formatRows = [];
        if (d.hardcoverPrice) formatRows.push({ bookId: book.id, format: "HARDCOVER" as const, price: d.hardcoverPrice.toFixed(2), stock: 25 });
        if (d.paperbackPrice) formatRows.push({ bookId: book.id, format: "PAPERBACK" as const, price: d.paperbackPrice.toFixed(2), stock: 40 });
        if (d.ebookPrice)
          formatRows.push({
            bookId: book.id,
            format: "EBOOK" as const,
            price: d.ebookPrice.toFixed(2),
            stock: 9999,
            fileKey: `ebooks/${slug}.pdf`,
            fileSize: "4.2 MB",
            fileType: "PDF / EPUB",
          });
        if (formatRows.length) await db.insert(bookFormats).values(formatRows);

        await recordAudit({
          admin: guard.user, action: "CREATE", resource: "book",
          resourceId: book.id, newValue: { title: d.title, isbn: d.isbn }, request,
        });
        return NextResponse.json({ success: true, bookId: book.id }, { status: 201 });
      }
      case "coupons": {
        const parsed = couponCreateSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
        if (!parsed.data.discountPercent && !parsed.data.fixedAmount) {
          return NextResponse.json({ error: "Provide a percent or fixed discount" }, { status: 400 });
        }
        const [coupon] = await db
          .insert(coupons)
          .values({
            code: parsed.data.code.toUpperCase(),
            discountPercent: parsed.data.discountPercent ?? null,
            fixedAmount: parsed.data.fixedAmount?.toFixed(2) ?? null,
            minOrderAmount: parsed.data.minOrderAmount.toFixed(2),
            maxDiscount: parsed.data.maxDiscount?.toFixed(2) ?? null,
            usageLimit: parsed.data.usageLimit ?? null,
            expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
          })
          .returning();
        await recordAudit({
          admin: guard.user, action: "CREATE", resource: "coupon",
          resourceId: coupon.id, newValue: { code: coupon.code }, request,
        });
        return NextResponse.json({ success: true, couponId: coupon.id }, { status: 201 });
      }
      default:
        return NextResponse.json({ error: "Use PATCH for updates on this resource" }, { status: 405 });
    }
  } catch (err) {
    await captureException(err, { route: `admin/${resource}` });
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;
  const { resource } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    switch (resource as Resource) {
      case "orders": {
        const { id, ...rest } = body as { id?: number | string };
        const parsed = orderStatusSchema.safeParse(rest);
        if (!parsed.success || !id) return NextResponse.json({ error: "Invalid status payload" }, { status: 400 });
        const [order] = await db.select().from(orders).where(eq(orders.id, String(id))).limit(1);
        if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
        await db.update(orders).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(orders.id, String(id)));
        await recordAudit({
          admin: guard.user, action: "UPDATE_STATUS", resource: "order", resourceId: String(id),
          oldValue: { status: order.status }, newValue: { status: parsed.data.status }, request,
        });
        return NextResponse.json({ success: true });
      }
      case "reviews": {
        const { id, ...rest } = body as { id?: number };
        const parsed = reviewModerationSchema.safeParse(rest);
        if (!parsed.success || !id) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        await db.update(reviews).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(reviews.id, id));
        return NextResponse.json({ success: true });
      }
      case "books": {
        // Stock management: { stock: { formatId, stock } }
        if (body && typeof (body as { stock?: unknown }).stock === "object") {
          const parsed = stockUpdateSchema.safeParse((body as { stock: unknown }).stock);
          if (!parsed.success) return NextResponse.json({ error: "Invalid stock payload" }, { status: 400 });
          const [prevFmt] = await db.select().from(bookFormats).where(eq(bookFormats.id, parsed.data.formatId)).limit(1);
          await db.update(bookFormats).set({ stock: parsed.data.stock }).where(eq(bookFormats.id, parsed.data.formatId));
          await recordAudit({
            admin: guard.user, action: "UPDATE_STOCK", resource: "bookFormat", resourceId: parsed.data.formatId,
            oldValue: { stock: prevFmt?.stock }, newValue: { stock: parsed.data.stock }, request,
          });
          return NextResponse.json({ success: true });
        }
        // Bulk operations: { bulk: { ids: number[], action, value? } }
        if (body && typeof (body as { bulk?: unknown }).bulk === "object") {
          const bulkSchema = z.object({
            ids: z.array(z.number().int().positive()).min(1).max(200),
            action: z.enum(["feature", "unfeature", "bestseller", "unbestseller", "newArrival", "clearNew", "delete", "setCategory"]),
            categoryId: z.number().int().positive().optional(),
          });
          const bulk = bulkSchema.safeParse((body as { bulk: unknown }).bulk);
          if (!bulk.success) return NextResponse.json({ error: "Invalid bulk payload" }, { status: 400 });

          const { ids, action, categoryId } = bulk.data;
          if (action === "delete") {
            await db.delete(books).where(inArray(books.id, ids));
          } else if (action === "setCategory") {
            if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });
            await db.update(books).set({ categoryId, updatedAt: new Date() }).where(inArray(books.id, ids));
          } else {
            const map = {
              feature: { isFeatured: true }, unfeature: { isFeatured: false },
              bestseller: { isBestseller: true }, unbestseller: { isBestseller: false },
              newArrival: { isNewArrival: true }, clearNew: { isNewArrival: false },
            } as const;
            await db.update(books).set({ ...map[action], updatedAt: new Date() }).where(inArray(books.id, ids));
          }

          await recordAudit({
            admin: guard.user, action: `BULK_${action.toUpperCase()}`, resource: "book",
            resourceId: ids.join(","), newValue: { count: ids.length, categoryId }, request,
          });
          return NextResponse.json({ success: true, affected: ids.length });
        }

        // Feature flags: { id, isFeatured?, isBestseller?, isNewArrival? }
        const { id, ...flags } = body as { id?: number; isFeatured?: boolean; isBestseller?: boolean; isNewArrival?: boolean };
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
        await db
          .update(books)
          .set({
            ...(typeof flags.isFeatured === "boolean" ? { isFeatured: flags.isFeatured } : {}),
            ...(typeof flags.isBestseller === "boolean" ? { isBestseller: flags.isBestseller } : {}),
            ...(typeof flags.isNewArrival === "boolean" ? { isNewArrival: flags.isNewArrival } : {}),
            updatedAt: new Date(),
          })
          .where(eq(books.id, id));
        await recordAudit({
          admin: guard.user, action: "UPDATE_FLAGS", resource: "book", resourceId: id,
          newValue: flags, request,
        });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Not supported" }, { status: 405 });
    }
  } catch (err) {
    await captureException(err, { route: `admin/${resource}` });
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ resource: string }> }
) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;
  const { resource } = await params;
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    switch (resource as Resource) {
      case "books": {
        const [prev] = await db.select({ title: books.title }).from(books).where(eq(books.id, id)).limit(1);
        await db.delete(books).where(eq(books.id, id));
        await recordAudit({ admin: guard.user, action: "DELETE", resource: "book", resourceId: id, oldValue: prev, request });
        return NextResponse.json({ success: true });
      }
      case "coupons": {
        await db.delete(coupons).where(eq(coupons.id, id));
        await recordAudit({ admin: guard.user, action: "DELETE", resource: "coupon", resourceId: id, request });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Not supported" }, { status: 405 });
    }
  } catch (err) {
    await captureException(err, { route: `admin/${resource}` });
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
