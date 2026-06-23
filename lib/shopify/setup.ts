import fs from "node:fs";
import path from "node:path";
import { resolveProductConfig } from "../product-config.js";
import type { ShopifySubscriptionProduct } from "../types.js";
import { shopifyExec, shopifyStoreExecJson } from "./cli.js";
import { bootstrapLink } from "./link.js";
import { mergeStateProducts, syncProducts } from "./products.js";
import { getStateDir, getStatePath, readState, writeState } from "./state.js";

export function runShopifySetup(
  subscriptionProducts: ShopifySubscriptionProduct[],
): void {
  if (process.env.STOREFRONT_SHOPIFY_SETUP !== "1") {
    return;
  }

  const { productName } = resolveProductConfig();

  bootstrapLink();
  const products = syncProducts(subscriptionProducts);
  const state = mergeStateProducts(readState(), products);
  writeState(state);

  console.log(`${productName} Shopify setup complete:`);
  for (const p of products) {
    console.log(`  - ${p.label}: ${p.gid}`);
    if (p.checkoutUrl) {
      console.log(`    checkout: ${p.checkoutUrl}`);
    }
  }
}

export function runShopifyTeardown(mode: "dev" | "prod" = "dev"): void {
  const { productName } = resolveProductConfig();
  const state = readState();
  if (!state) {
    throw new Error(`No ${getStatePath()} found. Run npm run setup first.`);
  }

  const config =
    mode === "prod" ? "shopify.app.prod.toml" : "shopify.app.dev.toml";

  for (const product of state.products) {
    const gid = product.gid.replace(/"/g, '\\"');
    const mutation = `mutation { productDelete(input: { id: "${gid}" }) { deletedProductId userErrors { message } } }`;
    try {
      shopifyStoreExecJson(["--allow-mutations", "--query", mutation]);
      console.log(`Deleted product ${product.label}`);
    } catch (err) {
      console.warn(`Failed to delete ${product.label}:`, err);
    }
  }

  try {
    shopifyExec(["app", "deploy", "--config", config, "--allow-updates"], {
      stdio: "inherit",
    });
  } catch {
    // deploy may fail if webhooks already cleared
  }

  const stateDir = getStateDir();
  if (fs.existsSync(getStatePath())) {
    fs.unlinkSync(getStatePath());
  }
  const mutationsDir = path.join(stateDir, "mutations");
  if (fs.existsSync(mutationsDir)) {
    fs.rmSync(mutationsDir, { recursive: true, force: true });
  }

  console.log(`${productName} Shopify teardown complete.`);
}
