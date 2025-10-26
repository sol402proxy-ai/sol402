# Changelog

## 2025-10-27 — Paywall UI rollback
- Reverted the browser-specific paywall HTML; `/p/:id` now always responds with the JSON 402 challenge so agents and browsers follow the same flow.
- Removed facilitator clipboard/link automation and refreshed docs/tests to match the original behaviour.
- Updated defaults and site copy with the live SOL402 Pump.fun mint (`HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump`).

## 2025-10-27 — Analytics & resiliency
- Persisted marketing funnel events by wiring `window.sol402Track` to `/analytics/events` with KV-backed storage and a cron exporter.
- Added Solana RPC retry/backoff instrumentation for token holder discounts with structured attempt logging and metrics fan-out.
- Swapped Worker inline marketing assets for the `MARKETING_ASSETS` R2 bucket, introduced Worker cron scheduling, and documented Extrnode + observability setup.
- Retuned holder perks: 5 free calls/day unlock at ≥1M tokens and the 25% discount kicks in at ≥2M, with copy/config refreshed across the stack.

## 2025-10-26 — Public beta launch
- Added marketing and documentation pages defined in `AGENTS.md` Section 14.
- Published public assets (`/robots.txt`, `/sitemap.xml`, `/og.png`) for launch.
- Updated README and implementation plan to cover setup, routes, and go-to-market collateral.
- Shipped Cloudflare Workers adapter (`src/worker.ts`, `src/lib/store-workers.ts`) and deployment configuration (`wrangler.toml`).
