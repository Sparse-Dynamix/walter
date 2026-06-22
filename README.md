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
- **Per-store auth** for Admin API (`shopify store auth`; see below)
- ngrok (dev webhooks)
- Docker (DynamoDB Local + aws-ses-v2-local)
- AWS account + verified SES sender (prod)

## Quick start (dev)

```bash
cp .env.example .env
# set SHOPIFY_STORE, SENDER_EMAIL, SHOPIFY_WEBHOOK_SECRET (see below)

shopify auth login
shopify store auth --store "$SHOPIFY_STORE" \
  --scopes read_orders,write_orders,write_products,read_customers,write_draft_orders

npm run setup    # synth + Shopify product sync (WALTER_SHOPIFY_SETUP=1)
npm run dev      # local API + ngrok
```

Payment links are printed during `npm run setup` (see `.walter/shopify-state.json`).

### Store auth (required before setup)

`shopify auth login` authenticates you to the Partner account. **`shopify store auth`** is a separate, per-store step that grants Walter's CLI access to your dev store Admin API (product sync, teardown, smoke tests). Re-run it when scopes change or you see "store not found" / permission errors during `npm run setup`.

### App credentials

From `shopify app env show --config shopify.app.dev.toml`, copy `SHOPIFY_API_SECRET` into `.env` as `SHOPIFY_WEBHOOK_SECRET` (webhook HMAC).

Webhooks registered by a different app (e.g. via `store execute` alone) will HMAC-sign with that app's secret and return 401.

### Install walter-dev

Walter uses [Shopify managed installation](https://shopify.dev/docs/apps/auth/installation#shopify-managed-installation) — no custom OAuth callback. After `npm run dev`, deploy with `shopify app deploy --config shopify.app.dev.toml --allow-updates` (set `application_url` to your public API URL first, or use `shopify app dev` so the CLI updates it). Install from the [Partner Dashboard](https://partners.shopify.com) → walter-dev → **Install app** → select your store.

### Browser checkout smoke test

Use a draft-order invoice URL if the storefront is password-protected. Complete payment manually in the browser (test card `4242424242424242` with Shopify Payments test mode on). `npm test` covers the webhook → DynamoDB → SES → revoke path without a browser.

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
