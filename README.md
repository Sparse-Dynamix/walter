# Walter

Walter is an (in)genius way to quickly build a SaaS monetized and authenticated through Shopify!

## Synopsis

Walter vends API keys for a simple SaaS. **Shopify handles payment only** — subscription products and checkout links. On `orders/paid`, the API creates an API key in DynamoDB and emails it via AWS SES. On cancellation or refund, keys are revoked and the customer is notified by email.

Webhooks:

- `orders/paid` — vend API key (one per order; same email can have multiple keys)
- `orders/cancelled` — revoke keys for that order and email the customer
- `refunds/create` — revoke keys for that order and email the customer

`GET|POST /api/check` validates API keys for your SaaS.

Built with **AWS CDK**, **Hono**, **React Email**, and the **Shopify CLI** (no Hydrogen storefront).

## Product configuration

Every deployment requires explicit product identity. Set these in `.env` (see [`.env.example`](.env.example)):

| Variable | Purpose |
|----------|---------|
| `PRODUCT_NAME` | Human-readable branding in emails (e.g. `Acme API`) |
| `PRODUCT_SLUG` | URL-safe id for AWS resource names (e.g. `acme-api`) |
| `SENDER_DOMAIN` | SES verified domain for outbound email (e.g. `acme.com`) |
| `SENDER_EMAIL` | Optional; defaults to `noreply@${SENDER_DOMAIN}` |

AWS resources are named from `PRODUCT_SLUG`, so you can deploy multiple products to the same account:

- CloudFormation stack: `{slug}-storefront`
- DynamoDB table: `{slug}-api-keys`
- HTTP API: `{slug}-api`
- SES domain identity: `SENDER_DOMAIN`

## Requirements

- Shopify Partner account + dev store (`shopify auth login`)
- **Per-store auth** for Admin API (`shopify store auth`; see below)
- ngrok (dev webhooks)
- Docker (DynamoDB Local + aws-ses-v2-local)
- AWS account + verified SES sender domain (prod)

## Quick start (dev)

```bash
cp .env.example .env
# set PRODUCT_NAME, PRODUCT_SLUG, SENDER_DOMAIN, SHOPIFY_STORE, SHOPIFY_WEBHOOK_SECRET

shopify auth login
shopify store auth --store "$SHOPIFY_STORE" \
  --scopes read_orders,write_orders,write_products,read_customers,write_draft_orders

npm run setup    # synth + Shopify product sync (STOREFRONT_SHOPIFY_SETUP=1)
npm run dev      # local API + ngrok
```

Payment links are printed during `npm run setup` (see `.storefront/{PRODUCT_SLUG}/shopify-state.json`).

### Store auth (required before setup)

`shopify auth login` authenticates you to the Partner account. **`shopify store auth`** is a separate, per-store step that grants the CLI access to your dev store Admin API (product sync, teardown, smoke tests). Re-run it when scopes change or you see "store not found" / permission errors during `npm run setup`.

### App credentials

From `shopify app env show --config shopify.app.dev.toml`, copy `SHOPIFY_API_SECRET` into `.env` as `SHOPIFY_WEBHOOK_SECRET` (webhook HMAC).

Webhooks registered by a different app (e.g. via `store execute` alone) will HMAC-sign with that app's secret and return 401.

### Install the dev app

After `npm run dev`, deploy with `shopify app deploy --config shopify.app.dev.toml --allow-updates` (set `application_url` to your public API URL first, or use `shopify app dev` so the CLI updates it). Install from the [Partner Dashboard](https://partners.shopify.com) → your dev app → **Install app** → select your store.

### Browser checkout smoke test

Use a draft-order invoice URL if the storefront is password-protected. Complete payment manually in the browser (test card `4242424242424242` with Shopify Payments test mode on). `npm test` covers the webhook → DynamoDB → SES → revoke path without a browser.

## Prod

Deploy one product:

```bash
export PRODUCT_NAME="Acme API"
export PRODUCT_SLUG=acme-api
export SENDER_DOMAIN=acme.com
export SENDER_EMAIL=noreply@acme.com
export SHOPIFY_WEBHOOK_SECRET=...
npm run deploy:prod
```

After deploy, complete DNS verification for the SES domain identity (DKIM/SPF) in the AWS console.

Deploy a second product to the same account (different slug and domain):

```bash
export PRODUCT_NAME="Beta API"
export PRODUCT_SLUG=beta-api
export SENDER_DOMAIN=beta.io
export SENDER_EMAIL=noreply@beta.io
export SHOPIFY_WEBHOOK_SECRET=...
npm run deploy:prod
```

Each product needs its own Shopify app configuration (`shopify.app.*.toml`).

## Destroy

```bash
npm run destroy        # Shopify teardown (dev)
npm run destroy:prod   # Shopify teardown + cdk destroy
```

## L3 construct

```ts
import { ShopifyStorefront } from 'walter';

new ShopifyStorefront(this, 'Storefront', {
  mode: 'prod',
  productName: 'Acme API',
  productSlug: 'acme-api',
  senderDomain: 'acme.com',
  senderEmail: 'noreply@acme.com',
  subscriptionProducts: [
    { label: 'Starter', price: 9 },
    { label: 'Pro', price: 29 },
  ],
});
```

## Tests

```bash
npm test
```

Vitest integration tests require real Shopify CLI, Docker, and ngrok. Run `npm run setup` first.
