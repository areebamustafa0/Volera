import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { csrfGuard } from "@/lib/csrf";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

/** PATCH — change the authenticated user's password. Requires the current password. */
export async function PATCH(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const rl = rateLimit(`password-change:${clientKey(request)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A new password of at least 8 characters is required" }, { status: 400 });

  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const valid = await bcrypt.compare(parsed.data.currentPassword, row.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
