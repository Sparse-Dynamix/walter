import fs from "node:fs";
import path from "node:path";
import { shopifyExecJson, getRepoRoot, shopifyAppArgs } from "./cli.js";
import {
  ensureMutationsDir,
  readState,
  slugify,
  writeState,
  type ProductState,
  type ShopifyState,
} from "./state.js";

export interface ShopifySubscriptionProduct {
  price: number;
  label: string;
}

interface ProductCreateResponse {
  data?: {
    productCreate?: {
      product?: {
        id: string;
        title: string;
        variants?: { nodes?: Array<{ id: string }> };
      };
      userErrors?: Array<{ message: string }>;
    };
  };
}

interface ProductsQueryResponse {
  data?: {
    products?: {
      edges?: Array<{
        node: { id: string; title: string; onlineStoreUrl?: string };
      }>;
    };
  };
}

export function buildProductCreateMutation(
  product: ShopifySubscriptionProduct,
): string {
  const title = product.label.replace(/"/g, '\\"');
  const price = product.price.toFixed(2);
  return `mutation {
  productCreate(product: {
    title: "${title}",
    status: ACTIVE,
    variants: [{ price: "${price}" }]
  }) {
    product { id title variants(first: 1) { nodes { id } } }
    userErrors { field message }
  }
}`;
}

export function findProductByTitle(title: string): ProductState | undefined {
  const query = `{
  products(first: 50, query: "title:${title.replace(/"/g, '\\"')}") {
    edges { node { id title onlineStoreUrl } }
  }
}`;
  const response = shopifyExecJson<ProductsQueryResponse>([
    "app",
    "execute",
    ...shopifyAppArgs(),
    "--query",
    query,
  ]);

  const node = response.data?.products?.edges?.[0]?.node;
  if (!node) {
    return undefined;
  }

  return {
    label: node.title,
    gid: node.id,
    checkoutUrl: node.onlineStoreUrl,
  };
}

export function upsertProduct(
  product: ShopifySubscriptionProduct,
): ProductState {
  const existing = findProductByTitle(product.label);
  if (existing) {
    return existing;
  }

  const mutationsDir = ensureMutationsDir();
  const slug = slugify(product.label);
  const mutationFile = path.join(mutationsDir, `product-${slug}.graphql`);
  fs.writeFileSync(mutationFile, buildProductCreateMutation(product));

  const response = shopifyExecJson<ProductCreateResponse>([
    "app",
    "execute",
    ...shopifyAppArgs(),
    "--query-file",
    mutationFile,
  ]);

  const errors = response.data?.productCreate?.userErrors;
  if (errors?.length) {
    throw new Error(
      `productCreate failed: ${errors.map((e) => e.message).join(", ")}`,
    );
  }

  const created = response.data?.productCreate?.product;
  if (!created?.id) {
    throw new Error(`productCreate returned no product for ${product.label}`);
  }

  const storeDomain = process.env.SHOPIFY_STORE;
  const variantId = created.variants?.nodes?.[0]?.id?.split("/").pop();
  const checkoutUrl =
    storeDomain && variantId
      ? `https://${storeDomain}/cart/${variantId}:1`
      : undefined;

  return {
    label: created.title,
    gid: created.id,
    checkoutUrl,
  };
}

export function syncProducts(
  products: ShopifySubscriptionProduct[],
): ProductState[] {
  return products.map(upsertProduct);
}

export function mergeStateProducts(
  state: ShopifyState | undefined,
  products: ProductState[],
): ShopifyState {
  return {
    storeDomain: state?.storeDomain ?? process.env.SHOPIFY_STORE,
    appClientId: state?.appClientId,
    products,
    updatedAt: new Date().toISOString(),
  };
}

export function readTomlClientId(): string | undefined {
  const tomlPath = path.join(getRepoRoot(), "shopify.app.dev.toml");
  if (!fs.existsSync(tomlPath)) {
    return undefined;
  }
  const content = fs.readFileSync(tomlPath, "utf8");
  const match = content.match(/^client_id\s*=\s*"([^"]*)"/m);
  return match?.[1] || undefined;
}
