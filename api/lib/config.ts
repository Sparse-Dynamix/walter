export function getTableName(): string {
  return process.env.TABLE_NAME ?? "walter-api-keys";
}

export function getSenderEmail(): string {
  const email = process.env.SENDER_EMAIL;
  if (!email) {
    throw new Error("SENDER_EMAIL is required");
  }
  return email;
}

export function getWebhookSecret(): string {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("SHOPIFY_WEBHOOK_SECRET is required");
  }
  return secret;
}

export function isDevEndpoints(): boolean {
  return Boolean(process.env.DYNAMODB_ENDPOINT || process.env.SES_ENDPOINT);
}
