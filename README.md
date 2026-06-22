# Walter

Walter is an (in)genius way to quickly build a SaaS monetized and authenticated through Shopify!

## Synopsis

Walter vends API keys for a simple SaaS. **Shopify handles payment only** — subscription products and checkout links. On `orders/paid`, Walter creates an API key in DynamoDB and emails it via AWS SES.

Webhooks:

- `orders/paid` — vend API key (one per order; same email can have multiple keys)
- `orders/cancelled` — revoke keys for that order
- `refunds/create` — revoke keys for that order

`GET|POST /api/check` validates API keys for your SaaS.

Built with **AWS CDK**, **Hono**, **React Email**, and the **Shopify CLI** (no Hydrogen storefront).

## Requirements

- Shopify Partner account + dev store (`shopify auth login`)
- ngrok (dev webhooks)
- Docker (DynamoDB Local + aws-ses-v2-local)
- AWS account + verified SES sender (prod)

## Quick start (dev)

```bash
cp .env.example .env
# set SHOPIFY_STORE, SENDER_EMAIL

npm run setup    # synth + Shopify product sync (WALTER_SHOPIFY_SETUP=1)
npm run dev      # local API + ngrok + shopify app dev
```

Payment links are printed during `npm run setup` (see `.walter/shopify-state.json`).

## Prod

```bash
export SENDER_EMAIL=... SHOPIFY_WEBHOOK_SECRET=...
npm run deploy:prod
```

## Destroy

```bash
npm run destroy        # Shopify teardown (dev)
npm run destroy:prod   # Shopify teardown + cdk destroy
```

## L3 construct

```ts
import { ShopifyStorefront } from 'walter';

new ShopifyStorefront(this, 'Storefront', {
  mode: 'dev', // or 'prod'
  subscriptionProducts: [
    { label: 'Starter', price: 9 },
    { label: 'Pro', price: 29 },
  ],
  senderEmail: 'noreply@yourdomain.com',
});
```

## Tests

```bash
npm test
```

Vitest integration tests require real Shopify CLI, Docker, and ngrok. Run `npm run setup` first.
