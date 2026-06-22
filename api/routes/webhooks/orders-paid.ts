import { Hono } from "hono";
import { createApiKey, isOrderAlreadyVended } from "../../db/keys.js";
import { generateApiKey } from "../../lib/hash.js";
import {
  extractCustomerEmail,
  extractOrderId,
  extractProductLabel,
  type ShopifyOrderPayload,
} from "../../lib/shopify-payload.js";
import { sendApiKeyEmail } from "../../lib/ses.js";
import {
  shopifyWebhookMiddleware,
  type WebhookVariables,
} from "../../middleware/shopify-webhook.js";

export const ordersPaidRoute = new Hono<{ Variables: WebhookVariables }>();

ordersPaidRoute.post(
  "/webhooks/orders-paid",
  shopifyWebhookMiddleware,
  async (c) => {
    const rawBody = c.get("webhookRawBody");
    const payload = JSON.parse(rawBody) as ShopifyOrderPayload;
    const orderId = extractOrderId(payload);
    const email = extractCustomerEmail(payload);

    if (!email) {
      return c.json({ error: "Order has no customer email" }, 422);
    }

    if (await isOrderAlreadyVended(orderId)) {
      return c.json({ ok: true, skipped: true, reason: "already_vended" });
    }

    const apiKey = generateApiKey();
    const productLabel = extractProductLabel(payload);

    await createApiKey({ apiKey, email, orderId, productLabel });
    await sendApiKeyEmail({ apiKey, productLabel, recipientEmail: email });

    return c.json({ ok: true, orderId });
  },
);
