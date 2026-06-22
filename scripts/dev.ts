#!/usr/bin/env tsx
import { spawn, type ChildProcess } from "node:child_process";
import { serve } from "@hono/node-server";
import { app } from "../api/index.js";

const PORT = Number(process.env.PORT ?? 8787);
const children: ChildProcess[] = [];

function run(
  cmd: string,
  args: string[],
  env: Record<string, string> = {},
): ChildProcess {
  const child = spawn(cmd, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  children.push(child);
  return child;
}

async function waitForNgrok(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch("http://127.0.0.1:4040/api/tunnels");
      const data = (await res.json()) as {
        tunnels: Array<{ public_url: string; proto: string }>;
      };
      const https = data.tunnels.find((t) => t.proto === "https");
      if (https?.public_url) {
        return https.public_url;
      }
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("ngrok tunnel not available on :4040");
}

function shutdown(): void {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main(): Promise<void> {
  run("docker", ["compose", "up", "-d", "dynamodb-local", "ses-local"]);
  run("npx", ["tsx", "scripts/dynamodb-init.ts"]);

  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`Walter API listening on http://localhost:${PORT}`);
  });

  run("ngrok", ["http", String(PORT)]);
  const publicUrl = await waitForNgrok();
  const host = new URL(publicUrl).host;

  console.log(`ngrok: ${publicUrl}`);

  run("shopify", [
    "app",
    "dev",
    "--config",
    "shopify.app.dev.toml",
    `--tunnel-url=https://${host}:${PORT}`,
  ]);

  console.log("Dev stack running. SES viewer: http://localhost:8005");
}

main().catch((err) => {
  console.error(err);
  shutdown();
});
