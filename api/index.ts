import { Hono } from "hono";
import { checkRoutes } from "./routes/check.js";
import { ordersPaidRoute } from "./routes/webhooks/orders-paid.js";
import { ordersCancelledRoute } from "./routes/webhooks/orders-cancelled.js";
import { refundsCreateRoute } from "./routes/webhooks/refunds-create.js";

export function createApp(): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.route("/", checkRoutes);
  app.route("/", ordersPaidRoute);
  app.route("/", ordersCancelledRoute);
  app.route("/", refundsCreateRoute);

  return app;
}

export const app = createApp();
