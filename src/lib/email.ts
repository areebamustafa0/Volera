import { Resend } from "resend";

/**
 * Email delivery via Resend. When RESEND_API_KEY is not configured the service
 * operates in "log-only" mode so the full architecture remains testable in dev.
 */
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "Velora Books <library@velorabooks.com>";

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const client = getClient();
  if (!client) {
    // Dev fallback: never silently drop — log a structured record instead.
    console.info("[email:outbox]", JSON.stringify({ to: opts.to, subject: opts.subject }));
    return { delivered: false, mode: "log-only" as const };
  }
  try {
    await client.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
    return { delivered: true, mode: "resend" as const };
  } catch (err) {
    console.error("[email:failed]", err);
    return { delivered: false, mode: "failed" as const };
  }
}

const shell = (body: string) => `
<div style="background:#F7F3EC;padding:32px;font-family:Georgia,serif;color:#171513">
  <div style="max-width:560px;margin:0 auto;background:#FCFAF6;border:1px solid #C8A96B;border-radius:12px;padding:40px">
    <div style="text-align:center;letter-spacing:6px;font-weight:bold;font-size:22px">VELORA</div>
    <div style="text-align:center;letter-spacing:4px;font-size:10px;color:#A88A55;margin-bottom:24px">BOOKS</div>
    ${body}
    <p style="font-size:11px;color:#8a8178;margin-top:32px">Where Stories Become Timeless.</p>
  </div>
</div>`;

export const emailTemplates = {
  orderConfirmation(orderNumber: string, total: string, hasDigital: boolean) {
    return shell(`
      <h2 style="font-weight:normal">Your order is confirmed</h2>
      <p>Thank you for your purchase. Order <strong>#${orderNumber}</strong> for <strong>$${total}</strong> has been received.</p>
      ${hasDigital ? `<p>Your eBooks are now available in <strong>My Library</strong>. Read online or download securely at any time.</p>` : `<p>Your physical editions will ship within 1–2 business days.</p>`}
    `);
  },
  passwordReset(resetUrl: string) {
    return shell(`
      <h2 style="font-weight:normal">Reset your password</h2>
      <p>We received a request to reset your Velora Books password.</p>
      <p><a href="${resetUrl}" style="background:#171513;color:#F7F3EC;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>
      <p style="font-size:12px">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
    `);
  },
  verifyEmail(verifyUrl: string) {
    return shell(`
      <h2 style="font-weight:normal">Confirm your email</h2>
      <p>Welcome to Velora Books. Please confirm your email address to enable checkout, downloads, and reviews.</p>
      <p><a href="${verifyUrl}" style="background:#171513;color:#F7F3EC;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Verify Email</a></p>
      <p style="font-size:12px">This link expires in 24 hours.</p>
    `);
  },
  newsletterWelcome() {
    return shell(`
      <h2 style="font-weight:normal">Welcome to the Velora Gazette</h2>
      <p>Letters for people who love books. Expect curated recommendations and private editorial drops.</p>
    `);
  },
};
