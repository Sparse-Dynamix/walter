import { spawnSync } from "node:child_process";
import fs from "node:fs";
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
    ) as NodeJS.ErrnoException & {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    err.status = result.status ?? 1;
    err.stdout = result.stdout;
    err.stderr = result.stderr;
    throw err;
  }
  return result.stdout ?? "";
}

export function getRepoRoot(): string {
  return REPO_ROOT;
}

export function getStoreDomain(): string | undefined {
  const fromEnv = process.env.SHOPIFY_STORE;
  if (fromEnv) {
    return fromEnv.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  const projectJson = path.join(REPO_ROOT, ".shopify", "project.json");
  if (fs.existsSync(projectJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(projectJson, "utf8")) as {
        shop?: string;
        dev_store_url?: string;
      };
      const store = data.dev_store_url ?? data.shop;
      if (store) {
        return store.replace(/^https?:\/\//, "").replace(/\/$/, "");
      }
    } catch {
      // ignore
    }
  }
  return undefined;
}

export function shopifyStoreExecJson<T>(
  args: string[],
  options: ExecOptions = {},
): T {
  const store = getStoreDomain();
  if (!store) {
    throw new Error(
      "No Shopify store configured. Set SHOPIFY_STORE or run shopify app config link.",
    );
  }
  const output = shopifyExec(
    ["store", "execute", "--store", store, "--json", ...args],
    options,
  );
  return JSON.parse(output) as T;
}
