# Analytics Dashboard Plan

## Status
- ✅ Metrics endpoint & caching deployed behind `/dashboard/metrics`.
- ✅ Dashboard UI now displays live usage (summary cards, daily trend, top referrers, recent activity, per-link analytics).
- ✅ `/dashboard/balance` returns live SOL402 balance + tier delta (leveraging cached RPC + tier helper).
- ✅ `/dashboard/webhooks` queries ClickHouse for `webhook_delivery_*` events and powers the dashboard health card (falls back to copy when no events exist).
- ✅ Webhook dispatcher now emits `webhook_delivery_success` / `webhook_delivery_failure` analytics events after every attempt.
- ⏳ Remaining: ensure the cron exporter streams those events to ClickHouse in production, expand charts (latency timeline), and wire alerts once delivery logs accumulate.

## Objectives
- Surface per-link and per-wallet usage stats (paid calls, free calls, revenue) inside `/dashboard`.
- Provide holders with real-time insight into quota consumption, token perks, and webhook health.
- Keep the UI responsive by caching ClickHouse responses and limiting expensive queries.

## Data Sources
- **ClickHouse (analytics events table)** – records emitted by the Worker cron exporter (`ANALYTICS_SINK_*` secrets). We'll derive time-bucketed metrics (24h, 7d, lifetime) per link and wallet.
- **KV Link Store** – authoritative store for link metadata (price, tier caps, previews). Used to hydrate dashboard cards.
- **Solana RPC (Extrnode/Helius)** – fetch live SPL balance for the merchant wallet to display token perks in the dashboard.
- **Webhook delivery events** – exported to ClickHouse as `webhook_delivery_success` / `webhook_delivery_failure`. The new metrics service reads these rows to populate the dashboard health card.
- **New server-side analytics events (required)** – emit paywall settlement events when `recordLinkUsage` succeeds so we capture `linkId`, `merchantAddress`, `amountUsd`, `isFree`, and `referrer` in ClickHouse.

## Metrics & Aggregations
- **Paid calls**: total and last 24h counts per link and per wallet.
- **Free calls**: total and last 24h counts (to track perk usage).
- **Revenue USD**: derived from paid call count × price, with tier-specific discounts applied.
- **Top referrers**: group by `referrer_host` (if present) for the last 24h, top-N.
- **Recent activity stream**: latest paid/free call events with timestamp, link ID, and amount.
- **Quota consumption**: map link request counts to the tier’s daily cap to compute % used.
- **Token balance**: fetch SOL402 SPL balance and compare against tier thresholds.
- **Webhook status (future)**: show last delivery timestamp, failure count (placeholder for now).

## Backend Work
1. **ClickHouse client helper**
   - Reuse existing secrets (`ANALYTICS_SINK_URL`, auth header, database/table).
   - Wrap fetch logic with timeout, retry jitter, and structured logging.

2. **Aggregation layer**
   - Parameterised queries for:
     - `summary_metrics(wallet, window=24h|7d|lifetime)`
     - `link_breakdown(wallet)`
     - `recent_activity(wallet, limit=25)`
     - `top_referrers(wallet, window=24h)`
   - Cache results in KV (`analytics-cache:{wallet}`) for 60 seconds to avoid hammering ClickHouse.
   - Rate-limit using existing `rateLimiter` (e.g., 10 requests/minute per wallet).

3. **Dashboard endpoints**
   - `GET /dashboard/metrics` – returns aggregated JSON keyed by wallet and link ID.
   - `GET /dashboard/links/:id/metrics` (optional) – deep dive for a single link.
   - Ensure endpoints authenticate via API key session, log request duration, and surface cache hits.

4. **Tests**
   - Unit tests for ClickHouse query builder and cache behaviour (mock fetch).
   - Integration tests using pre-baked ClickHouse responses to confirm JSON shape.
   - Rate limit & cache expiry tests.
- **Instrumentation**
  - Already wired: the paywall flow emits `link_paid_call` / `link_free_call` events (props include `linkId`, `merchantAddress`, `priceUsd`, `requestId`, `referrer`, `walletTier`, `discountApplied`/`reason`) right after successful settlement.
  - Already wired: the webhook dispatcher emits `webhook_delivery_success` / `webhook_delivery_failure` with props `{ merchantAddress, linkId, webhookUrl, responseStatus, latencyMs, attempt, errorMessage, paid, priceUsd }`.
  - Next steps: monitor the Worker cron/exporter to guarantee those events reach ClickHouse, add alerting for exporter failures, and backfill if any batches were missed.

## Frontend Work
- **Fetch layer**
  - Extend dashboard client to load `/dashboard/metrics` on mount and every 60s.
  - Display “Last updated” timestamp and manual refresh button.
- **Summary cards**
  - Paid calls, revenue, free-call quota, SOL402 balance (with tier CTA if below next threshold).
- **Charts & tables**
  - Traffic trend (7-day line chart with paid/free series).
  - Revenue trend (7-day area/column chart).
  - Top referrers (horizontal bar list).
  - Recent activity table (timestamp, link, type, amount/usd, status).
  - Link performance list sorted by 24h volume.
- **Webhook + quota modules**
  - ✅ Webhook status card renders 24h success/failure counts and recent deliveries whenever `webhook_delivery_*` events exist (falls back to copy otherwise).
  - Quota meter showing % of daily cap used and alert when >80% (still pending).
- **Mobile layout**
  - Stack cards, charts, and tables; keep refresh + tier info near top.

## Tooling Decisions
- **Charting**: lean SVG/Canvas library (Chart.js or lightweight custom components) once data API validated.
- **Styling**: reuse existing layout utilities (`src/site/layout.ts`) with responsive tweaks.
- **Caching**: 60s KV cache with background refresh to keep UI responsive.
- **Docs**: update `README.md` dashboard section and add a troubleshooting note about ClickHouse credentials.

## Implementation Order
1. Implement backend metrics helper + endpoint (`/dashboard/metrics`) with caching.
2. Build frontend fetch + summary cards (release incrementally without charts if needed).
3. Add charts/top referrers/recent activity once data is confirmed.
4. Integrate token balance + webhook status modules.
5. Update docs/tests and deploy.

## Token Balance Widget Specification

- **Backend contract**
  - `GET /dashboard/balance` (auth via scoped key) → `{ wallet: string, tokenMint: string, balance: string, uiAmount: number, refreshedAt: string }`.
  - Uses existing token perks service with live SPL balance fetch (Extrnode). Cache result in KV for 30 seconds to avoid RPC spam.
  - On error (RPC unavailable), respond with `503` and include `{"message":"Token balance temporarily unavailable"}`.
- **UI behaviour**
  - Display current SOL402 balance, current tier, and next threshold delta (“2.3M SOL402 · Premium · 700k to Elite”).
  - Refresh automatically when metrics poll runs; allow manual refresh via the existing Refresh button.
  - Show warning state if balance drops below the tier needed for existing links (copy: “Balance dipped below Growth threshold—discounts pause after cooldown.”).
- **Analytics**
  - Fire `dashboard_balance_loaded` event with `tier` and `balance`.

## Webhook Health Widget Specification

- **Backend contract**
  - `GET /dashboard/webhooks` (auth via scoped key) → `{ generatedAt, summary, recentDeliveries }` where `summary` contains `{ success24h, failure24h, failureRate24h, lastSuccessAt, lastFailureAt }`.
  - Data source: ClickHouse `analytics_events` table filtered on `webhook_delivery_success` / `webhook_delivery_failure`.
  - Cache for 60 seconds; rate-limit to 5/minute.
- **UI behaviour**
  - Card with status badge (“Delivered”/“Failed”), quick stats (24h counts + failure rate), and recent entries with attempts, latency, response code, error message.
  - Empty state text: “Webhooks launch with Premium tier. You’ll see delivery history here once enabled.” (still shown when no events exist).
- **Alerts**
  - If failure rate >10% in last 24h, show red banner suggestion (“Reach out—delivery errors above 10%”).

## Open Questions
- Webhook exporter observability: add cron success/failure metrics so we know when ClickHouse insert jobs fall behind.
- Should token balance polling be tied to wallet-connect events to avoid unnecessary RPC hits for inactive dashboards?
- When balance falls below tier requirements, do we instantly downgrade link quotas or allow grace period? Need policy before final UI copy.
