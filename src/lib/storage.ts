/**
 * Private object storage for purchased eBooks.
 *
 * eBook binaries MUST NEVER live in /public or be reachable by a guessable
 * URL. This module is the only place that resolves a storage location, and it
 * always returns a *time-limited* URL or a server-side stream — never a
 * permanent public path.
 *
 * Configure S3 / Cloudflare R2 via S3_ENDPOINT + S3_BUCKET_NAME + keys.
 * When storage is not configured, the app serves generated content from the
 * database through the authenticated route handler (still never public).
 */
import crypto from "crypto";

export function isPrivateStorageConfigured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET_NAME &&
      process.env.S3_ACCESS_KEY &&
      process.env.S3_SECRET_KEY
  );
}

/** Guards against path traversal and any attempt to point at /public. */
export function assertSafeFileKey(fileKey: string): void {
  if (
    !fileKey ||
    fileKey.includes("..") ||
    fileKey.startsWith("/") ||
    fileKey.toLowerCase().startsWith("public/")
  ) {
    throw new Error("Invalid eBook storage key");
  }
}

/**
 * AWS SigV4 pre-signed GET URL (S3 / R2 compatible), valid for `expiresIn`
 * seconds. Generated only after ownership has been verified by the caller.
 */
export function createSignedStorageUrl(fileKey: string, expiresIn = 300): string {
  assertSafeFileKey(fileKey);

  const endpoint = process.env.S3_ENDPOINT!;
  const bucket = process.env.S3_BUCKET_NAME!;
  const accessKey = process.env.S3_ACCESS_KEY!;
  const secretKey = process.env.S3_SECRET_KEY!;
  const region = process.env.S3_REGION ?? "auto";

  const host = new URL(endpoint).host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalUri = `/${bucket}/${fileKey.split("/").map(encodeURIComponent).join("/")}`;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  });

  const canonicalRequest = [
    "GET",
    canonicalUri,
    params.toString(),
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const hmac = (key: Buffer | string, data: string) =>
    crypto.createHmac("sha256", key).update(data).digest();

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), "s3"), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  params.set("X-Amz-Signature", signature);
  return `${endpoint.replace(/\/$/, "")}${canonicalUri}?${params.toString()}`;
}
