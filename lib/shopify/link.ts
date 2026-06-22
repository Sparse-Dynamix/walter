import fs from "node:fs";
import path from "node:path";
import { getRepoRoot, shopifyExec } from "./cli.js";
import { readTomlClientId } from "./products.js";
import { readState, writeState, type ShopifyState } from "./state.js";

function readShopifyProjectStore(): string | undefined {
  const projectJson = path.join(getRepoRoot(), ".shopify", "project.json");
  if (!fs.existsSync(projectJson)) {
    return undefined;
  }
  try {
    const data = JSON.parse(fs.readFileSync(projectJson, "utf8")) as {
      shop?: string;
      dev_store_url?: string;
    };
    return data.dev_store_url ?? data.shop;
  } catch {
    return undefined;
  }
}

export function ensureAppLinked(): string {
  const fromEnv = process.env.SHOPIFY_STORE;
  if (fromEnv) {
    return fromEnv.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  const fromProject = readShopifyProjectStore();
  if (fromProject) {
    return fromProject.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  const clientId = readTomlClientId();
  if (clientId) {
    throw new Error(
      `Shopify app is linked (client_id ${clientId}) but no dev store is set. ` +
        "Create a dev store at https://dev.shopify.com/dashboard, then set SHOPIFY_STORE " +
        "or run shopify app dev to populate .shopify/project.json.",
    );
  }

  shopifyExec(["app", "config", "link", "--config", "shopify.app.dev.toml"], {
    stdio: "inherit",
  });

  const linked = readShopifyProjectStore();
  if (!linked) {
    throw new Error(
      "Shopify app is not linked. Run shopify auth login and shopify app config link, or set SHOPIFY_STORE.",
    );
  }

  return linked.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function persistLinkMetadata(state: ShopifyState): ShopifyState {
  const storeDomain = ensureAppLinked();
  return {
    ...state,
    storeDomain,
    appClientId: readTomlClientId() ?? state.appClientId,
  };
}

export function bootstrapLink(): void {
  const store = ensureAppLinked();
  const state = persistLinkMetadata(
    readState() ?? { products: [], updatedAt: "" },
  );
  writeState({
    ...state,
    storeDomain: store,
    updatedAt: new Date().toISOString(),
  });
}
