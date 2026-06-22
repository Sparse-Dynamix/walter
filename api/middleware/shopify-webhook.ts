import { createMiddleware } from "hono/factory";
import { verifyShopifyWebhook } from "../lib/hmac.js";
import { getWebhookSecret } from "../lib/config.js";

export type WebhookVariables = {
  webhookRawBody: string;
};

export const shopifyWebhookMiddleware = createMiddleware<{
  Variables: WebhookVariables;
}>(async (c, next) => {
  const rawBody = await c.req.text();
  const hmac = c.req.header("X-Shopify-Hmac-Sha256");

  if (!verifyShopifyWebhook(rawBody, hmac, getWebhookSecret())) {
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  c.set("webhookRawBody", rawBody);
  return next();
});
