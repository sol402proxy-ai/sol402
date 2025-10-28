# Analytics Dashboard Plan

## Objectives
- Surface per-link and per-wallet usage stats (paid calls, free calls, revenue) inside `/dashboard`.
- Provide holders with real-time insight into quota consumption, token perks, and webhook health.
- Keep the UI responsive by caching ClickHouse responses and limiting expensive queries.

## Data Sources
- **ClickHouse (analytics events table)** – records emitted by the Worker cron exporter (`ANALYTICS_SINK_*` secrets). We'll derive time-bucketed metrics (24h, 7d, lifetime) per link and wallet.
- **KV Link Store** – authoritative store for link metadata (price, tier caps, previews). Used to hydrate dashboard cards.
- **Solana RPC (Extrnode/Helius)** – fetch live SPL balance for the merchant wallet to display token perks in the dashboard.
- **Webhook delivery logs** – not live yet; placeholder section will read from KV once webhooks are implemented.

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
  - Quota meter showing % of daily cap used and alert when >80%.
  - Webhook status card (placeholder copy until deliveries are tracked).
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

