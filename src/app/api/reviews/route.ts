import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews, orders, orderItems, books } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { reviewSchema, reviewModerationSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { csrfGuard } from "@/lib/csrf";
import { sql } from "drizzle-orm";

async function userPurchasedBook(userId: string, bookId: number): Promise<boolean> {
  const rows = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), eq(orders.status, "PAID"), eq(orderItems.bookId, bookId)))
    .limit(1);
  return rows.length > 0;
}

/** POST — create a review. Requires a PAID purchase of the book. */
export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const rl = rateLimit(`review:${clientKey(request)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email address before posting a review.", code: "EMAIL_UNVERIFIED" },
      { status: 403 }
    );
  }

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });

  const purchased = await userPurchasedBook(user.id, parsed.data.bookId);
  if (!purchased) {
    return NextResponse.json(
      { error: "Only verified purchasers may review this title" },
      { status: 403 }
    );
  }

  const [existing] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, user.id), eq(reviews.bookId, parsed.data.bookId)))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "You have already reviewed this book" }, { status: 409 });
  }

  await db.insert(reviews).values({
    userId: user.id,
    bookId: parsed.data.bookId,
    rating: parsed.data.rating,
    title: parsed.data.title,
    comment: parsed.data.comment,
    status: "PENDING",
  });

  return NextResponse.json({ success: true, moderation: "pending" }, { status: 201 });
}

/** PATCH ?id= — owner edits own review OR admin moderates. */
export async function PATCH(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing review id" }, { status: 400 });

  const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  // Admin moderation path
  if (user.role === "ADMIN" && "status" in body) {
    const mod = reviewModerationSchema.safeParse(body);
    if (!mod.success) return NextResponse.json({ error: "Invalid moderation payload" }, { status: 400 });
    await db.update(reviews).set({ status: mod.data.status, updatedAt: new Date() }).where(eq(reviews.id, id));
    return NextResponse.json({ success: true });
  }

  // Owner edit path
  if (review.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const edit = reviewSchema.partial().safeParse(body);
  if (!edit.success) return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
  await db
    .update(reviews)
    .set({ ...edit.data, status: "PENDING", updatedAt: new Date() })
    .where(eq(reviews.id, id));
  return NextResponse.json({ success: true });
}

/** DELETE ?id= — owner or admin. */
export async function DELETE(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  if (review.userId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db.delete(reviews).where(eq(reviews.id, id));
  return NextResponse.json({ success: true });
}

/** GET ?bookId= — approved reviews + whether requester may review. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = Number(url.searchParams.get("bookId"));
  if (!bookId) return NextResponse.json({ error: "Missing bookId" }, { status: 400 });

  const approved = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      userName: sql<string>`u.name`,
    })
    .from(reviews)
    .innerJoin(sql`users u`, sql`u.id = ${reviews.userId}`)
    .where(and(eq(reviews.bookId, bookId), eq(reviews.status, "APPROVED")));

  const user = await getCurrentUser();
  let canReview = false;
  let hasReviewed = false;
  if (user) {
    canReview = await userPurchasedBook(user.id, bookId);
    const [mine] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, user.id), eq(reviews.bookId, bookId)))
      .limit(1);
    hasReviewed = Boolean(mine);
  }

  return NextResponse.json({ reviews: approved, canReview: canReview && !hasReviewed, hasReviewed });
}
