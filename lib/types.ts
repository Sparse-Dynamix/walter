export interface ShopifySubscriptionProduct {
  price: number;
  label: string;
}

export type DeployMode = "dev" | "prod";

export type { ProductConfig } from "./product-config.js";
