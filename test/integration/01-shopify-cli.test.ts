import { describe, expect, it } from "vitest";
import { requireShopifyCli } from "../helpers/prerequisites.js";
import { getStatePath, readState } from "../../lib/shopify/state.js";

describe("shopify cli integration", () => {
  it("has linked store state after setup", () => {
    requireShopifyCli();

    const state = readState();
    if (!state) {
      throw new Error(
        `No ${getStatePath()} — run npm run setup with Shopify CLI authenticated.`,
      );
    }

    expect(state.products.length).toBeGreaterThan(0);
    expect(state.storeDomain || process.env.SHOPIFY_STORE).toBeTruthy();
  });
});
