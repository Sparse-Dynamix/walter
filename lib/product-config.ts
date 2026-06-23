export interface ProductConfig {
  productName: string;
  productSlug: string;
  senderDomain: string;
  senderEmail: string;
}

const PRODUCT_SLUG_RE = /^[a-z0-9-]{2,32}$/;
const SENDER_DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function validateProductSlug(slug: string): void {
  if (!PRODUCT_SLUG_RE.test(slug)) {
    throw new Error(
      "PRODUCT_SLUG must be 2-32 lowercase letters, numbers, or hyphens",
    );
  }
}

export function validateSenderDomain(domain: string): void {
  if (!SENDER_DOMAIN_RE.test(domain)) {
    throw new Error("SENDER_DOMAIN must be a valid domain name");
  }
}

export function validateSenderEmail(email: string, senderDomain: string): void {
  const at = email.lastIndexOf("@");
  if (at <= 0) {
    throw new Error("SENDER_EMAIL must be a valid email address");
  }
  const domain = email.slice(at + 1).toLowerCase();
  const expected = senderDomain.toLowerCase();
  if (domain !== expected && !domain.endsWith(`.${expected}`)) {
    throw new Error(`SENDER_EMAIL must be on ${senderDomain}`);
  }
}

export function resolveProductConfig(
  env: NodeJS.ProcessEnv = process.env,
): ProductConfig {
  const productName = env.PRODUCT_NAME;
  const productSlug = env.PRODUCT_SLUG;
  const senderDomain = env.SENDER_DOMAIN;

  if (!productName) {
    throw new Error("PRODUCT_NAME is required");
  }
  if (!productSlug) {
    throw new Error("PRODUCT_SLUG is required");
  }
  if (!senderDomain) {
    throw new Error("SENDER_DOMAIN is required");
  }

  validateProductSlug(productSlug);
  validateSenderDomain(senderDomain);

  const senderEmail = env.SENDER_EMAIL ?? `noreply@${senderDomain}`;
  validateSenderEmail(senderEmail, senderDomain);

  return { productName, productSlug, senderDomain, senderEmail };
}

export function apiKeysTableName(productSlug: string): string {
  return `${productSlug}-api-keys`;
}

export function apiGatewayName(productSlug: string): string {
  return `${productSlug}-api`;
}

export function toStackConstructId(productSlug: string): string {
  const id = productSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `${id}Stack`;
}

export function storefrontStackName(productSlug: string): string {
  return `${productSlug}-storefront`;
}
