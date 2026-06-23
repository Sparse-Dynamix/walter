import { createHmac } from "node:crypto";
import { execSync } from "node:child_process";
import { describe, expect, it, beforeAll } from "vitest";
import { requireDocker, requireEnv } from "../helpers/prerequisites.js";
import { app } from "../../api/index.js";
import { getKeysByOrderId } from "../../api/db/keys.js";

describe("revoke flow", () => {
  beforeAll(() => {
    requireDocker();
    requireEnv("SHOPIFY_WEBHOOK_SECRET");
    execSync("docker compose up -d dynamodb-local ses-local", {
      stdio: "inherit",
    });
    execSync("npx tsx scripts/dynamodb-init.ts", { stdio: "inherit" });
  });

  async function postWebhook(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<Response> {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET!;
    const rawBody = JSON.stringify(payload);
    const hmac = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");
    return app.request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Hmac-Sha256": hmac,
      },
      body: rawBody,
    });
  }

  it("revokes key and emails on orders/cancelled", async () => {
    const orderId = String(Date.now());
    const productName = process.env.PRODUCT_NAME!;

    const paidRes = await postWebhook("/webhooks/orders-paid", {
      id: Number(orderId),
      email: "revoke-test@example.com",
      line_items: [{ title: "Starter" }],
    });
    expect(paidRes.status).toBe(200);

    const sesBefore = await fetch("http://localhost:8005/store");
    const storeBefore = (await sesBefore.json()) as {
      emails?: Array<{ subject?: string }>;
    };
    const countBefore = storeBefore.emails?.length ?? 0;

    const cancelRes = await postWebhook("/webhooks/orders-cancelled", {
      id: Number(orderId),
    });
    expect(cancelRes.status).toBe(200);
    const cancelBody = (await cancelRes.json()) as { revoked: number };
    expect(cancelBody.revoked).toBe(1);

    const keys = await getKeysByOrderId(orderId);
    expect(keys).toHaveLength(1);
    expect(keys[0].status).toBe("revoked");

    const sesAfter = await fetch("http://localhost:8005/store");
    const storeAfter = (await sesAfter.json()) as {
      emails?: Array<{ subject?: string }>;
    };
    expect(storeAfter.emails?.length).toBeGreaterThan(countBefore);

    const subjects = storeAfter.emails?.map((e) => e.subject ?? "") ?? [];
    expect(
      subjects.some((s) => s.includes(productName) && s.includes("revoked")),
    ).toBe(true);
  });

  it("revokes key and emails on refunds/create", async () => {
    const orderId = String(Date.now() + 1);

    const paidRes = await postWebhook("/webhooks/orders-paid", {
      id: Number(orderId),
      email: "refund-test@example.com",
      line_items: [{ title: "Pro" }],
    });
    expect(paidRes.status).toBe(200);

    const refundRes = await postWebhook("/webhooks/refunds-create", {
      order_id: Number(orderId),
    });
    expect(refundRes.status).toBe(200);
    const refundBody = (await refundRes.json()) as { revoked: number };
    expect(refundBody.revoked).toBe(1);

    const keys = await getKeysByOrderId(orderId);
    expect(keys[0].status).toBe("revoked");
  });
});
