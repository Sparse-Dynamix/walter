import { Hono } from "hono";
import { revokeKeysByOrderId } from "../../db/keys.js";
import {
  extractRefundOrderId,
  type ShopifyRefundPayload,
} from "../../lib/shopify-payload.js";
import {
  shopifyWebhookMiddleware,
  type WebhookVariables,
} from "../../middleware/shopify-webhook.js";

export const refundsCreateRoute = new Hono<{ Variables: WebhookVariables }>();

refundsCreateRoute.post(
  "/webhooks/refunds-create",
  shopifyWebhookMiddleware,
  async (c) => {
    const rawBody = c.get("webhookRawBody");
    const payload = JSON.parse(rawBody) as ShopifyRefundPayload;
    const orderId = extractRefundOrderId(payload);

    if (!orderId) {
      return c.json({ error: "Refund payload missing order_id" }, 422);
    }

    const revoked = await revokeKeysByOrderId(orderId);
    return c.json({ ok: true, orderId, revoked });
  },
);
