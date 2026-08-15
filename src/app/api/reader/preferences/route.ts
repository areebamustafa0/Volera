import { NextResponse } from "next/server";
import { db } from "@/db";
import { readerPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { csrfGuard } from "@/lib/csrf";
import { z } from "zod";

const prefsSchema = z.object({
  theme: z.enum(["light", "dark", "sepia"]).optional(),
  fontSize: z.number().int().min(12).max(34).optional(),
  fontFamily: z.enum(["serif", "georgia", "sans"]).optional(),
  lineHeight: z.number().min(1.2).max(2.6).optional(),
});

const DEFAULTS = { theme: "light" as const, fontSize: 18, fontFamily: "serif" as const, lineHeight: 1.9 };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ preferences: DEFAULTS });

  const [row] = await db
    .select()
    .from(readerPreferences)
    .where(eq(readerPreferences.userId, user.id))
    .limit(1);

  return NextResponse.json({
    preferences: row
      ? {
          theme: row.theme,
          fontSize: row.fontSize,
          fontFamily: row.fontFamily,
          lineHeight: Number(row.lineHeight),
        }
      : DEFAULTS,
  });
}

/** PATCH — persist reader settings so the reader reopens exactly as left. */
export async function PATCH(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const parsed = prefsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });

  const patch = {
    ...(parsed.data.theme ? { theme: parsed.data.theme } : {}),
    ...(parsed.data.fontSize ? { fontSize: parsed.data.fontSize } : {}),
    ...(parsed.data.fontFamily ? { fontFamily: parsed.data.fontFamily } : {}),
    ...(parsed.data.lineHeight ? { lineHeight: parsed.data.lineHeight.toFixed(2) } : {}),
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: readerPreferences.id })
    .from(readerPreferences)
    .where(eq(readerPreferences.userId, user.id))
    .limit(1);

  if (existing) {
    await db.update(readerPreferences).set(patch).where(eq(readerPreferences.id, existing.id));
  } else {
    await db.insert(readerPreferences).values({ userId: user.id, ...patch });
  }

  return NextResponse.json({ success: true });
}
