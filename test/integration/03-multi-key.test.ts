import { describe, expect, it, beforeAll } from "vitest";
import { requireEnv } from "../helpers/prerequisites.js";

describe("multi-key per email", () => {
  beforeAll(async () => {
    const { execSync } = await import("node:child_process");
    const { requireDocker } = await import("../helpers/prerequisites.js");
    requireDocker();
    execSync("docker compose up -d dynamodb-local ses-local", {
      stdio: "inherit",
    });
    execSync("npx tsx scripts/dynamodb-init.ts", { stdio: "inherit" });
  });

  it("creates distinct keys for two orders with same email", async () => {
    const { app } = await import("../../api/index.js");
    const { getKeysByOrderId } = await import("../../api/db/keys.js");
    const { createHmac } = await import("node:crypto");
    const email = `multi-${Date.now()}@example.com`;
    const orderA = String(Date.now());
    const orderB = String(Date.now() + 1);

    async function postPaid(
      orderId: string,
      targetEmail: string,
    ): Promise<Response> {
      const secret = requireEnv("SHOPIFY_WEBHOOK_SECRET");
      const payload = {
        id: Number(orderId),
        email: targetEmail,
        line_items: [{ title: "Walter Pro" }],
      };
      const rawBody = JSON.stringify(payload);
      const hmac = createHmac("sha256", secret)
        .update(rawBody, "utf8")
        .digest("base64");
      return app.request("http://localhost/webhooks/orders-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-Sha256": hmac,
        },
        body: rawBody,
      });
    }

    const resA = await postPaid(orderA, email);
    const resB = await postPaid(orderB, email);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const keysA = await getKeysByOrderId(orderA);
    const keysB = await getKeysByOrderId(orderB);
    expect(keysA.length).toBe(1);
    expect(keysB.length).toBe(1);
    expect(keysA[0].apiKeyHash).not.toBe(keysB[0].apiKeyHash);
  });
});
