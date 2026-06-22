import fs from "node:fs";
import path from "node:path";
import { getRepoRoot } from "./cli.js";

export interface ProductState {
  label: string;
  gid: string;
  checkoutUrl?: string;
}

export interface ShopifyState {
  storeDomain?: string;
  appClientId?: string;
  products: ProductState[];
  updatedAt: string;
}

const STATE_DIR = ".walter";
const STATE_FILE = "shopify-state.json";

export function getStatePath(): string {
  return path.join(getRepoRoot(), STATE_DIR, STATE_FILE);
}

export function readState(): ShopifyState | undefined {
  const file = getStatePath();
  if (!fs.existsSync(file)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as ShopifyState;
}

export function writeState(state: ShopifyState): void {
  const dir = path.dirname(getStatePath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2));
}

export function ensureMutationsDir(): string {
  const dir = path.join(getRepoRoot(), STATE_DIR, "mutations");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
