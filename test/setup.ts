import { loadEnv } from "../lib/load-env.js";

loadEnv();

process.env.DYNAMODB_ENDPOINT ??= "http://localhost:8000";
process.env.SES_ENDPOINT ??= "http://localhost:8005";
process.env.TABLE_NAME ??= "walter-api-keys";
process.env.SENDER_EMAIL ??= "noreply@example.com";
process.env.SHOPIFY_WEBHOOK_SECRET ??= "test-webhook-secret";
