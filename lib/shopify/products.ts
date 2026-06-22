import fs from "node:fs";
import path from "node:path";
import { getRepoRoot, getStoreDomain, shopifyStoreExecJson } from "./cli.js";
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
  productCreate?: {
    product?: {
      id: string;
      title: string;
      variants?: { nodes?: Array<{ id: string }> };
    };
    userErrors?: Array<{ message: string }>;
  };
}

interface VariantUpdateResponse {
  productVariantsBulkUpdate?: {
    productVariants?: Array<{ id: string }>;
    userErrors?: Array<{ message: string }>;
  };
}

interface ProductsQueryResponse {
  products?: {
    edges?: Array<{
      node: {
        id: string;
        title: string;
        onlineStoreUrl?: string;
        variants?: { nodes?: Array<{ id: string }> };
      };
    }>;
  };
}

export function buildProductCreateMutation(
  product: ShopifySubscriptionProduct,
): string {
  const title = product.label.replace(/"/g, '\\"');
  return `mutation {
  productCreate(product: {
    title: "${title}",
    status: ACTIVE
  }) {
    product { id title variants(first: 1) { nodes { id } } }
    userErrors { field message }
  }
}`;
}

export function buildVariantPriceMutation(
  productId: string,
  variantId: string,
  price: string,
): string {
  return `mutation {
  productVariantsBulkUpdate(
    productId: "${productId}",
    variants: [{ id: "${variantId}", price: "${price}" }]
  ) {
    productVariants { id price }
    userErrors { field message }
  }
}`;
}

export function findProductByTitle(title: string): ProductState | undefined {
  const escaped = title.replace(/"/g, '\\"');
  const query = `{
  products(first: 10, query: "title:'${escaped}'") {
    edges { node { id title onlineStoreUrl variants(first: 1) { nodes { id } } } }
  }
}`;
  const response = shopifyStoreExecJson<ProductsQueryResponse>([
    "--query",
    query,
  ]);

  const node = response.products?.edges?.find(
    (edge) => edge.node.title === title,
  )?.node;
  if (!node) {
    return undefined;
  }

  const storeDomain = getStoreDomain();
  const variantId = node.variants?.nodes?.[0]?.id?.split("/").pop();
  const checkoutUrl =
    node.onlineStoreUrl ??
    (storeDomain && variantId
      ? `https://${storeDomain}/cart/${variantId}:1`
      : undefined);

  return {
    label: node.title,
    gid: node.id,
    checkoutUrl,
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

  const createResponse = shopifyStoreExecJson<ProductCreateResponse>([
    "--allow-mutations",
    "--query-file",
    mutationFile,
  ]);

  const createErrors = createResponse.productCreate?.userErrors;
  if (createErrors?.length) {
    throw new Error(
      `productCreate failed: ${createErrors.map((e) => e.message).join(", ")}`,
    );
  }

  const created = createResponse.productCreate?.product;
  if (!created?.id) {
    throw new Error(`productCreate returned no product for ${product.label}`);
  }

  const variantId = created.variants?.nodes?.[0]?.id;
  if (!variantId) {
    throw new Error(`productCreate returned no variant for ${product.label}`);
  }

  const priceMutationFile = path.join(
    mutationsDir,
    `variant-price-${slug}.graphql`,
  );
  fs.writeFileSync(
    priceMutationFile,
    buildVariantPriceMutation(created.id, variantId, product.price.toFixed(2)),
  );

  const priceResponse = shopifyStoreExecJson<VariantUpdateResponse>([
    "--allow-mutations",
    "--query-file",
    priceMutationFile,
  ]);

  const priceErrors = priceResponse.productVariantsBulkUpdate?.userErrors;
  if (priceErrors?.length) {
    throw new Error(
      `productVariantsBulkUpdate failed: ${priceErrors.map((e) => e.message).join(", ")}`,
    );
  }

  const storeDomain = getStoreDomain();
  const numericVariantId = variantId.split("/").pop();
  const checkoutUrl =
    storeDomain && numericVariantId
      ? `https://${storeDomain}/cart/${numericVariantId}:1`
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
    storeDomain: state?.storeDomain ?? getStoreDomain(),
    appClientId: state?.appClientId,
    products,
    updatedAt: new Date().toISOString(),
  };
}
