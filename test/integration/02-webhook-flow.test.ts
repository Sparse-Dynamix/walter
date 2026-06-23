import { createHmac } from "node:crypto";
import { execSync } from "node:child_process";
import { describe, expect, it, beforeAll } from "vitest";
import { requireDocker, requireEnv } from "../helpers/prerequisites.js";
import { app } from "../../api/index.js";
import { getKeysByOrderId } from "../../api/db/keys.js";

describe("webhook flow", () => {
  beforeAll(() => {
    requireDocker();
    requireEnv("SHOPIFY_WEBHOOK_SECRET");
    execSync("docker compose up -d dynamodb-local ses-local", {
      stdio: "inherit",
    });
    execSync("npx tsx scripts/dynamodb-init.ts", { stdio: "inherit" });
  });

  it("vends a key on orders/paid and emails via SES local", async () => {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET!;
    const orderId = String(Date.now());
    const payload = {
      id: Number(orderId),
      email: "test@example.com",
      line_items: [{ title: "Starter" }],
    };
    const rawBody = JSON.stringify(payload);
    const hmac = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");

    const webhookRes = await app.request(
      "http://localhost/webhooks/orders-paid",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-Sha256": hmac,
        },
        body: rawBody,
      },
    );

    expect(webhookRes.status).toBe(200);
    const keys = await getKeysByOrderId(orderId);
    expect(keys).toHaveLength(1);
    expect(keys[0].status).toBe("active");

    const sesRes = await fetch("http://localhost:8005/store");
    expect(sesRes.ok).toBe(true);
    const store = (await sesRes.json()) as { emails?: unknown[] };
    expect(store.emails?.length).toBeGreaterThan(0);
  });
});
