import fs from "node:fs";
import path from "node:path";
import { resolveProductConfig } from "../product-config.js";
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

const STATE_DIR = ".storefront";
const STATE_FILE = "shopify-state.json";

function getProductSlug(): string {
  return resolveProductConfig().productSlug;
}

export function getStateDir(): string {
  return path.join(getRepoRoot(), STATE_DIR, getProductSlug());
}

export function getStatePath(): string {
  return path.join(getStateDir(), STATE_FILE);
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
  const dir = path.join(getStateDir(), "mutations");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
