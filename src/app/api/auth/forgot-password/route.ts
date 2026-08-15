import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { forgotPasswordSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { csrfGuard } from "@/lib/csrf";

export async function POST(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const rl = rateLimit(`forgot:${clientKey(request)}`, 3, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);

  // Always respond identically to avoid account enumeration.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
    const origin = new URL(request.url).origin;
    await sendEmail({
      to: user.email,
      subject: "Reset your Velora Books password",
      html: emailTemplates.passwordReset(`${origin}/auth/reset-password?token=${token}`),
    });
  }

  return NextResponse.json({
    success: true,
    message: "If that email exists, a reset link has been sent.",
  });
}
