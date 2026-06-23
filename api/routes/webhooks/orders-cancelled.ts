import { Hono } from "hono";
import { revokeKeysByOrderId } from "../../db/keys.js";
import {
  extractOrderId,
  type ShopifyOrderPayload,
} from "../../lib/shopify-payload.js";
import { notifyRevokedKeys } from "../../lib/ses.js";
import {
  shopifyWebhookMiddleware,
  type WebhookVariables,
} from "../../middleware/shopify-webhook.js";

export const ordersCancelledRoute = new Hono<{ Variables: WebhookVariables }>();

ordersCancelledRoute.post(
  "/webhooks/orders-cancelled",
  shopifyWebhookMiddleware,
  async (c) => {
    const rawBody = c.get("webhookRawBody");
    const payload = JSON.parse(rawBody) as ShopifyOrderPayload;
    const orderId = extractOrderId(payload);
    const revoked = await revokeKeysByOrderId(orderId);
    await notifyRevokedKeys(revoked, "cancelled");
    return c.json({ ok: true, orderId, revoked: revoked.length });
  },
);
