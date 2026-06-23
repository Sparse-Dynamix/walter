#!/usr/bin/env tsx
import { loadEnv } from "../lib/load-env.js";

loadEnv();

import { spawn } from "node:child_process";
import {
  toStackConstructId,
  resolveProductConfig,
} from "../lib/product-config.js";
import { runShopifyTeardown } from "../lib/shopify/setup.js";

const mode = (process.env.DEPLOY_MODE ?? "dev") as "dev" | "prod";

runShopifyTeardown(mode);

if (mode === "prod") {
  const { productSlug } = resolveProductConfig();
  const stackId = toStackConstructId(productSlug);
  const child = spawn(
    "npx",
    ["cdk", "destroy", stackId, "-c", "mode=prod", "--force"],
    {
      stdio: "inherit",
      shell: true,
    },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}
