import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  apiGatewayName,
  apiKeysTableName,
  toStackConstructId,
} from "../../lib/product-config.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("prod synth", () => {
  it("synthesizes prod stack with AWS resources", () => {
    const productSlug = "acme-api";
    const stackId = toStackConstructId(productSlug);

    execSync("npx cdk synth -c mode=prod", {
      cwd: repoRoot,
      stdio: "pipe",
      env: {
        ...process.env,
        PRODUCT_NAME: "Acme API",
        PRODUCT_SLUG: productSlug,
        SENDER_DOMAIN: "acme.com",
        SENDER_EMAIL: "noreply@acme.com",
        STOREFRONT_SHOPIFY_SETUP: undefined,
      },
    });

    const templatePath = path.join(
      repoRoot,
      "cdk.out",
      `${stackId}.template.json`,
    );
    expect(fs.existsSync(templatePath)).toBe(true);
    const template = JSON.parse(fs.readFileSync(templatePath, "utf8")) as {
      Resources: Record<
        string,
        { Type: string; Properties?: Record<string, unknown> }
      >;
    };
    const types = Object.values(template.Resources).map((r) => r.Type);
    expect(types).toContain("AWS::DynamoDB::Table");
    expect(types).toContain("AWS::Lambda::Function");
    expect(types).toContain("AWS::ApiGatewayV2::Api");
    expect(types).toContain("AWS::SES::EmailIdentity");

    const table = Object.values(template.Resources).find(
      (r) => r.Type === "AWS::DynamoDB::Table",
    );
    expect(table?.Properties?.TableName).toBe(apiKeysTableName(productSlug));

    const api = Object.values(template.Resources).find(
      (r) => r.Type === "AWS::ApiGatewayV2::Api",
    );
    expect(api?.Properties?.Name).toBe(apiGatewayName(productSlug));
  });
});
