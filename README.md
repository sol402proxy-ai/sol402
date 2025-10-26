# Sol402 Proxy

Sol402 turns any origin URL or API into a pay-per-request endpoint. The first request answers with HTTP 402 + x402 payment requirements; after settlement we proxy the origin response 1:1 and pass back an `X-PAYMENT-RESPONSE` receipt. Wallets holding ≥1M of the configured token receive 5 free calls per day, and stacking ≥2M triggers a 25% holder discount. Token holders can claim discounts or free daily calls.

- Token symbol: `SOL402`
- Token CA: `HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and populate the required values (merchant address, facilitator URL, token mint, etc.).
3. Run the development server with fast refresh:
   ```bash
   npm run dev
   ```
4. Verify the app is alive:
   ```bash
   curl http://localhost:4020/healthz
   ```

### Solana RPC (Extrnode)

Provision a dedicated Solana RPC endpoint with Extrnode and keep the URL private. Set it in your local `.env` and Cloudflare secrets:

```bash
SOLANA_RPC_URL=https://solana-mainnet.rpc.extrnode.com/b25026fe-8bd3-4f49-beba-64e75db8deb6
```

Never commit the raw URL; treat it as a secret when sharing configs or examples.

### Test the 402 flow locally

```bash
# 1) Seed a link (requires ADMIN_API_KEY in the environment)
curl -X POST http://localhost:4020/admin/links \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"origin":"https://httpbin.org/json","priceUsd":0.01}'

# 2) Request the paywalled link and inspect the 402 payload
curl -i http://localhost:4020/p/<linkId>
```

Whether you hit the link from curl or a browser, the first response is HTTP 402 with a JSON `challenge`. Send that payload to PayAI (or another x402 client), collect the `X-PAYMENT` receipt, and retry the same URL with the header attached.

Retrying the same URL with a valid `X-PAYMENT` header settles the charge and streams the origin response back. See `tests/e2e.402-flow.test.ts` for a full stubbed example.

## Key Routes

- `POST /admin/links` — create a paywalled link (admin-key guarded).
- `GET /p/:id` — paywalled fetch with token perks, rate limiting, and proxy security; the first response is always a JSON 402 challenge.
- `GET /admin/links/:id/preview` — admin-only passthrough to inspect origin content without payment.
- Marketing & docs pages: `/`, `/api`, `/link`, `/pricing`, `/docs/quickstart`, `/token`, `/faq`, `/legal/terms`, `/legal/privacy`, `/changelog`, `/status`.
- Static assets: `/robots.txt`, `/sitemap.xml`, `/og.png` (for OG/Twitter cards).
- `POST /analytics/events` — ingest marketing funnel events emitted by `window.sol402Track`.
- Holder perks: wallets with ≥1M tokens get 5 free calls/day; reaching ≥2M applies the 25% discount automatically.

## Scripts

- `npm run dev` — start the Hono server with hot reloading.
- `npm run build` / `npm run start` — compile to `dist/` and run the Node build.
- `npm test` — run the full Vitest suite with coverage.
- `npm run lint` / `npm run format:check` — lint and format checks.

## Deploy to Cloudflare Workers

1. Ensure the Cloudflare Wrangler CLI is installed (`npm install -g wrangler` or use `npx wrangler`).
2. Create KV namespaces for paywalled links and analytics events:
   ```bash
   wrangler kv:namespace create sol402-links
   wrangler kv:namespace create sol402-analytics
   ```
   Paste the generated `id` / `preview_id` into the `LINKS_KV` and `ANALYTICS_KV` bindings in `wrangler.toml`.
3. Configure secrets and vars for production (merchant wallet, admin key, token settings):
   ```bash
   wrangler secret put ADMIN_API_KEY
   wrangler secret put MERCHANT_ADDRESS
   ```
   Non-secret values can remain in the `[vars]` table.
4. Provision an R2 bucket for marketing assets (robots, sitemap, OG image) and upload files from `public/`:
   ```bash
   wrangler r2 bucket create sol402-marketing-assets
   wrangler r2 object put sol402-marketing-assets/robots.txt --file=public/robots.txt
   wrangler r2 object put sol402-marketing-assets/sitemap.xml --file=public/sitemap.xml
   wrangler r2 object put sol402-marketing-assets/og.png --file=public/og.png
   ```
   Assign the bucket to the `MARKETING_ASSETS` binding in `wrangler.toml` (preview + production).
5. (Optional) Configure analytics + metrics exports by setting:
   ```bash
   wrangler secret put SOLANA_RPC_URL
   wrangler secret put RPC_METRICS_URL
   wrangler secret put ANALYTICS_SINK_URL
   ```
   Add any required auth headers via `RPC_METRICS_AUTH_HEADER` / `ANALYTICS_SINK_AUTH_HEADER` secrets.
6. Deploy the Worker bundle:
   ```bash
   wrangler deploy
   ```
   The Worker entry (`src/worker.ts`) hydrates the shared Hono app, swaps in the KV/analytics stores, streams marketing assets from the `MARKETING_ASSETS` bucket, and exposes a cron-powered analytics exporter.
7. For local testing, run `wrangler dev --var ADMIN_API_KEY=dev-admin-key` to hit the Worker with curl or a browser.

### Analytics & Metrics

- `/analytics/events` stores browser beacons in `ANALYTICS_KV`; the Worker cron (see `[[triggers]]` in `wrangler.toml`) batches them to `ANALYTICS_SINK_URL`.
- Recommended sink: ClickHouse Cloud. Create a service, generate an insert token, and create the table:
  ```sql
  CREATE TABLE sol402.analytics_events (
    id String,
    name String,
    path String,
    props JSON,
    userAgent String,
    ip String,
    referrer String,
    occurredAt DateTime,
    receivedAt DateTime,
    exportedAt DateTime
  )
  ENGINE = MergeTree
  ORDER BY (occurredAt, id);
  ```
  Set `ANALYTICS_SINK_URL` to the HTTPS endpoint, `ANALYTICS_SINK_DATABASE=sol402`, `ANALYTICS_SINK_TABLE=analytics_events`, and provide auth via `ANALYTICS_SINK_AUTH_HEADER`.
- Token holder discount RPC calls emit metrics to `RPC_METRICS_URL` so you can monitor Extrnode latency and failure rates. Provide an auth header via `RPC_METRICS_AUTH_HEADER` if your sink requires it. For Grafana Cloud Loki, set `RPC_METRICS_URL=https://logs-prod-028.grafana.net/loki/api/v1/push` and `RPC_METRICS_AUTH_HEADER=Basic <base64("1374949:<grafana-token>")>`.

## Project Structure

- `src/server.ts` — Node entry point that serves static assets from `public/` and boots the app for local dev.
- `src/worker.ts` — Cloudflare Worker entry that builds config from `env`, attaches the KV store, and exposes `fetch`.
- `src/routes/` — admin + paywall endpoints; `routes/site.ts` renders the marketing pages.
- `src/lib/` — pricing, token perks, security guards, rate limiter, and logging utilities.
- `public/` — marketing assets (`robots.txt`, `sitemap.xml`, `og.png`).
- `docs/launch/` — launch collateral (tweets, casts, Product Hunt copy, email template).
- `tests/` — unit, integration, and end-to-end coverage for payments, security, and proxying.

## Additional References

- `AGENTS.md` — canonical build brief, marketing copy, and open task queue.
- `IMPLEMENTATION_PLAN.md` — milestone history and acceptance criteria.
- `CHANGELOG.md` — notable releases (latest: public beta launch).
