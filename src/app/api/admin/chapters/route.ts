import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookChapters } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { captureException } from "@/lib/monitoring";
import { csrfGuard } from "@/lib/csrf";

const chapterSchema = z.object({
  bookId: z.number().int().positive(),
  chapterNumber: z.number().int().min(1).max(2000),
  title: z.string().min(1).max(200),
  content: z.string().min(20).max(200_000),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (user.role !== "ADMIN") return { error: NextResponse.json({ error: "Admin privileges required" }, { status: 403 }) };
  return { user };
}

/** GET ?bookId= — list chapters for admin editing. */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const bookId = Number(new URL(request.url).searchParams.get("bookId"));
  if (!bookId) return NextResponse.json({ error: "Missing bookId" }, { status: 400 });

  const rows = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterNumber));
  return NextResponse.json({ chapters: rows });
}

/** POST — upload/replace a chapter of eBook content. */
export async function POST(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const parsed = chapterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid chapter" }, { status: 400 });
  }

  try {
    const wordCount = parsed.data.content.split(/\s+/).filter(Boolean).length;
    const [existing] = await db
      .select()
      .from(bookChapters)
      .where(
        and(eq(bookChapters.bookId, parsed.data.bookId), eq(bookChapters.chapterNumber, parsed.data.chapterNumber))
      )
      .limit(1);

    if (existing) {
      await db
        .update(bookChapters)
        .set({ title: parsed.data.title, content: parsed.data.content, wordCount })
        .where(eq(bookChapters.id, existing.id));
      return NextResponse.json({ success: true, updated: true });
    }

    await db.insert(bookChapters).values({ ...parsed.data, wordCount });
    return NextResponse.json({ success: true, created: true }, { status: 201 });
  } catch (err) {
    await captureException(err, { route: "admin/chapters" });
    return NextResponse.json({ error: "Could not save chapter" }, { status: 500 });
  }
}

/** DELETE ?id= */
export async function DELETE(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(bookChapters).where(eq(bookChapters.id, id));
  return NextResponse.json({ success: true });
}
