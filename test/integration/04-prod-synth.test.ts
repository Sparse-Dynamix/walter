import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("prod synth", () => {
  it("synthesizes prod stack with AWS resources", () => {
    execSync("npx cdk synth -c mode=prod", {
      cwd: repoRoot,
      stdio: "pipe",
      env: { ...process.env, WALTER_SHOPIFY_SETUP: undefined },
    });

    const templatePath = path.join(
      repoRoot,
      "cdk.out",
      "WalterStack.template.json",
    );
    expect(fs.existsSync(templatePath)).toBe(true);
    const template = JSON.parse(fs.readFileSync(templatePath, "utf8")) as {
      Resources: Record<string, { Type: string }>;
    };
    const types = Object.values(template.Resources).map((r) => r.Type);
    expect(types).toContain("AWS::DynamoDB::Table");
    expect(types).toContain("AWS::Lambda::Function");
    expect(types).toContain("AWS::ApiGatewayV2::Api");
  });
});
