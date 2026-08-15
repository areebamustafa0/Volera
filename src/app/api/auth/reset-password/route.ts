import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { resetPasswordSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { csrfGuard } from "@/lib/csrf";

export async function POST(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const rl = rateLimit(`reset:${clientKey(request)}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const [tokenRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, parsed.data.token))
    .limit(1);

  if (!tokenRow || tokenRow.used || tokenRow.expiresAt < new Date()) {
    return NextResponse.json({ error: "Reset link is invalid or has expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, tokenRow.userId));
    await tx.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, tokenRow.id));
  });

  return NextResponse.json({ success: true });
}
