import { execSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: "pipe" | "inherit";
}

export function shopifyExec(args: string[], options: ExecOptions = {}): string {
  const cwd = options.cwd ?? REPO_ROOT;
  const stdio = options.stdio ?? "pipe";
  const result = spawnSync("shopify", args, {
    cwd,
    encoding: "utf8",
    stdio,
    env: { ...process.env, ...options.env },
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const err = new Error(
      `Command failed: shopify ${args.join(" ")}\n${result.stderr ?? ""}`,
    ) as NodeJS.ErrnoException & { status?: number; stdout?: string; stderr?: string };
    err.status = result.status ?? 1;
    err.stdout = result.stdout;
    err.stderr = result.stderr;
    throw err;
  }
  return result.stdout ?? "";
}

export function shopifyExecJson<T>(
  args: string[],
  options: ExecOptions = {},
): T {
  const output = shopifyExec(args, options);
  return JSON.parse(output) as T;
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}

export function shopifyAppArgs(): string[] {
  const args = ["--config", "shopify.app.dev.toml"];
  const store = process.env.SHOPIFY_STORE;
  if (store) {
    args.push("--store", store.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  }
  return args;
}
