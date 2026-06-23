import { apiKeysTableName } from "../../lib/product-config.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getProductName(): string {
  return requireEnv("PRODUCT_NAME");
}

export function getProductSlug(): string {
  return requireEnv("PRODUCT_SLUG");
}

export function getSenderDomain(): string {
  return requireEnv("SENDER_DOMAIN");
}

export function getTableName(): string {
  const fromEnv = process.env.TABLE_NAME;
  if (fromEnv) {
    return fromEnv;
  }
  return apiKeysTableName(getProductSlug());
}

export function getSenderEmail(): string {
  const email = process.env.SENDER_EMAIL;
  if (email) {
    return email;
  }
  return `noreply@${getSenderDomain()}`;
}

export function getWebhookSecret(): string {
  return requireEnv("SHOPIFY_WEBHOOK_SECRET");
}

export function isDevEndpoints(): boolean {
  return Boolean(process.env.DYNAMODB_ENDPOINT || process.env.SES_ENDPOINT);
}
