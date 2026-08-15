import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { csrfGuard } from "@/lib/csrf";

/** GET ?token= — confirm an email address. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing verification token" }, { status: 400 });

  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, token))
    .limit(1);

  if (!row || row.used || row.expiresAt < new Date()) {
    return NextResponse.json({ error: "This verification link is invalid or has expired" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ emailVerified: new Date(), updatedAt: new Date() }).where(eq(users.id, row.userId));
    await tx.update(emailVerificationTokens).set({ used: true }).where(eq(emailVerificationTokens.id, row.id));
  });

  return NextResponse.json({ success: true });
}

/** POST — resend the verification email to the signed-in user. */
export async function POST(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const rl = rateLimit(`verify-resend:${clientKey(request)}`, 3, 300_000);
  if (!rl.ok) return NextResponse.json({ error: "Please wait before requesting another email" }, { status: 429 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (user.emailVerified) return NextResponse.json({ success: true, alreadyVerified: true });

  const token = crypto.randomBytes(32).toString("hex");
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });

  const origin = new URL(request.url).origin;
  await sendEmail({
    to: user.email,
    subject: "Verify your Velora Books account",
    html: emailTemplates.verifyEmail(`${origin}/auth/verify?token=${token}`),
  });

  return NextResponse.json({ success: true });
}
