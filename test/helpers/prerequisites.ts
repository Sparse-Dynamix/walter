import { execSync } from "node:child_process";

export function requireShopifyCli(): void {
  try {
    execSync("shopify version", { stdio: "pipe" });
  } catch {
    throw new Error(
      "Shopify CLI is required. Install and run shopify auth login.",
    );
  }
}

export function requireDocker(): void {
  try {
    execSync("docker info", { stdio: "pipe" });
  } catch {
    throw new Error("Docker is required for integration tests.");
  }
}

export function requireNgrok(): void {
  try {
    execSync("ngrok version", { stdio: "pipe" });
  } catch {
    throw new Error("ngrok CLI is required for integration tests.");
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
