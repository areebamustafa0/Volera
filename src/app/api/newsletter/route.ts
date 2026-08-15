import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { newsletterSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail, emailTemplates } from "@/lib/email";
import { csrfGuard } from "@/lib/csrf";

export async function POST(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const rl = rateLimit(`newsletter:${clientKey(request)}`, 3, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many subscription attempts" }, { status: 429 });

  const parsed = newsletterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  if (!existing) {
    await db.insert(newsletterSubscribers).values({ email });
    await sendEmail({
      to: email,
      subject: "Welcome to the Velora Gazette",
      html: emailTemplates.newsletterWelcome(),
    });
  }
  // Idempotent: existing subscribers get a success response regardless.
  return NextResponse.json({ success: true });
}
