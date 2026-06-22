#!/usr/bin/env tsx
import { loadEnv } from "../lib/load-env.js";

loadEnv();

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function patchProdToml(apiUrl: string): void {
  const tomlPath = path.join(repoRoot, "shopify.app.prod.toml");
  let content = fs.readFileSync(tomlPath, "utf8");
  const base = apiUrl.replace(/\/$/, "");
  content = content.replace(
    /^application_url\s*=.*/m,
    `application_url = "${base}"`,
  );
  fs.writeFileSync(tomlPath, content);
}

function readApiUrlFromOutputs(): string | undefined {
  const outputsPath = path.join(repoRoot, "cdk.out", "outputs.json");
  if (!fs.existsSync(outputsPath)) {
    return process.env.WALTER_API_URL;
  }
  const outputs = JSON.parse(fs.readFileSync(outputsPath, "utf8")) as Record<
    string,
    Record<string, string>
  >;
  const stack = outputs["WalterStack"];
  if (!stack) {
    return process.env.WALTER_API_URL;
  }
  return (
    stack.ApiUrl ??
    stack.StorefrontApiUrl ??
    Object.entries(stack).find(([k]) => k.includes("ApiUrl"))?.[1]
  );
}

execSync("npx cdk deploy -c mode=prod --require-approval never", {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

const apiUrl = readApiUrlFromOutputs();
if (!apiUrl) {
  throw new Error(
    "Could not determine ApiUrl from CDK outputs. Set WALTER_API_URL.",
  );
}

patchProdToml(apiUrl);
execSync("shopify app deploy --config shopify.app.prod.toml", {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log(`Prod deploy complete. API URL: ${apiUrl}`);
