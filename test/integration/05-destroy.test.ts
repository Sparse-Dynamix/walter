import { describe, it } from "vitest";
import { requireShopifyCli } from "../helpers/prerequisites.js";

describe("destroy", () => {
  it("documents manual destroy verification", () => {
    requireShopifyCli();
    // Run `npm run destroy` manually after other tests in CI; destructive.
  });
});
