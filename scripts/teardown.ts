#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { runShopifyTeardown } from "../lib/shopify/teardown.js";

const mode = (process.env.WALTER_MODE ?? "dev") as "dev" | "prod";

runShopifyTeardown(mode);

if (mode === "prod") {
  const child = spawn("npx", ["cdk", "destroy", "-c", "mode=prod", "--force"], {
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}
