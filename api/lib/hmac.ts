import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | undefined,
  secret: string,
): boolean {
  if (!hmacHeader) {
    return false;
  }

  const digest = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(hmacHeader);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
