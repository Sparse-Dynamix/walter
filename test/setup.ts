import { loadEnv } from "../lib/load-env.js";
import { apiKeysTableName } from "../lib/product-config.js";

loadEnv();

process.env.PRODUCT_NAME = "Test API";
process.env.PRODUCT_SLUG = "test-api";
process.env.SENDER_DOMAIN = "example.com";
process.env.SENDER_EMAIL = "noreply@example.com";
process.env.TABLE_NAME = apiKeysTableName(process.env.PRODUCT_SLUG);
process.env.DYNAMODB_ENDPOINT = "http://localhost:8000";
process.env.SES_ENDPOINT = "http://localhost:8005";
process.env.SHOPIFY_WEBHOOK_SECRET = "test-webhook-secret";
