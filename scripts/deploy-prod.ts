#!/usr/bin/env tsx
import { loadEnv } from "../lib/load-env.js";

loadEnv();

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveProductConfig,
  toStackConstructId,
} from "../lib/product-config.js";

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
  content = content.replace(
    /^redirect_urls\s*=.*/m,
    `redirect_urls = [ "${base}/health" ]`,
  );
  fs.writeFileSync(tomlPath, content);
}

function readApiUrlFromOutputs(): string | undefined {
  const { productSlug } = resolveProductConfig();
  const stackKey = toStackConstructId(productSlug);
  const apiUrlEnvKey = `${productSlug.toUpperCase().replace(/-/g, "_")}_API_URL`;
  const outputsPath = path.join(repoRoot, "cdk.out", "outputs.json");
  if (!fs.existsSync(outputsPath)) {
    return process.env[apiUrlEnvKey];
  }
  const outputs = JSON.parse(fs.readFileSync(outputsPath, "utf8")) as Record<
    string,
    Record<string, string>
  >;
  const stack = outputs[stackKey];
  if (!stack) {
    return process.env[apiUrlEnvKey];
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
  const { productSlug } = resolveProductConfig();
  throw new Error(
    `Could not determine ApiUrl from CDK outputs. Set ${productSlug.toUpperCase().replace(/-/g, "_")}_API_URL.`,
  );
}

patchProdToml(apiUrl);
execSync("shopify app deploy --config shopify.app.prod.toml", {
  cwd: repoRoot,
  stdio: "inherit",
});

console.log(`Prod deploy complete. API URL: ${apiUrl}`);
