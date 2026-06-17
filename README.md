# Walter

Walter is an (in)genius way to quickly build a SaaS monetized and authenticated through Shopify!

## Synopsis

Walter's primary objective is to vend API keys for a simple SaaS, which handles its storefront through Shopify.

The way it works is that, the SaaS offerings are listed on Shopify as products, and upon user payments, Shopify triggers Walter's webhooks which then kicks off API key vending and syncing into DynamoDB and delivery through AWS SES.

The three [Shopify webhooks](https://shopify.dev/docs/api/webhooks/latest#list-of-topics) Walter currently listens to are:

- `orders/paid`: a new API key is added for the email address that paid
- `orders/cancelled`: API key for the email address is revoked
- `refunds/create`: API key for the email address is revoked

Walter exposes an `/api/check` for consumption in the SaaS code itself to check API key validity.

Walter is built on the AWS CDK and uses [Shopify Hydrogen](https://shopify.dev/docs/api/shopify-cli/hydrogen) to manage the storefront.

Walter is coded in TypeScript and serves itself with [Hono](https://hono.dev).

## Requirements

- A working and validated Shopify account (for payments)
- A non sandbox AWS SES account (for emails and key vending)
- A DynamoDB database backend (to sync Shopify orders with)
- Authenticated Shopify and Ngrok CLIs (to run tests with)

## AWS CDK L3 Construct

```ts
export interface ShopifySubscriptionProduct extends cdk.Construct {
  price: number; // USD
  label: string;
}
```
