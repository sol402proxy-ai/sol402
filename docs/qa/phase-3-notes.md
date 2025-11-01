## Phase 3 (Docs, Link Builder, Dashboard) – Prep Notes

- `/docs/quickstart` now mirrors the redesign: hero with copy/snippet, four-step cards, resource grid, and integration FAQ.
- Snippet copy button uses the global `[data-copy]` handler—verify clipboard permissions during QA.
- Responsive behaviours to confirm during Phase 3D QA:
  - Docs hero stacks into a single column ≤1023px with snippet below the copy.
  - Buttons expand to full width on mobile for hero actions and resource cards.
  - Step cards, resource tiles, and FAQ accordion render as single-column stacks on small screens.
- Accessibility/perf checks queued for Phase 4B: Lighthouse ≥95, keyboard nav through `details/summary`, verify focus outline on resource cards.
- Pending content follow-up: populate live token + analytics stats once the data pipeline surfaces them for docs examples.

- Link builder (`/link/request`) now includes the new hero, configurator, tier summary, and support/CLI cards. QA should cover wallet connect messaging, estimator script, and success panel on desktop/tablet/mobile.
- Dashboard (`/dashboard`) hero + login shell revamped on 2025-11-02. Capture new responsive screenshots before final QA and ensure the `Launch builder / View pricing / Integration guide` CTAs hit the right routes on mobile.
- New `/dashboard/balance` API (2025-11-02) returns SOL402 holdings + tier deltas; add QA step to verify balance updates after simulated RPC change and that next-tier delta matches thresholds.

## Responsive Snapshot Archive

- Captured on 2025-10-31 (updated 2025-11-01 for new dashboard widgets) using Playwright Chromium.
- Stored in `docs/qa/phase-3/` with the following coverage:
  - `/docs/quickstart`: `phase-3-docs-desktop-1440x900.png`, `phase-3-docs-laptop-1280x720.png`, `phase-3-docs-tablet-834x1112.png`, `phase-3-docs-tablet-1080x810.png`, `phase-3-docs-mobile-390x844.png`.
  - `/link/request`: `phase-3-link-desktop-1440x900.png`, `phase-3-link-laptop-1280x720.png`, `phase-3-link-tablet-834x1112.png`, `phase-3-link-tablet-1080x810.png`, `phase-3-link-mobile-390x844.png`.
  - `/dashboard`: `phase-3-dashboard-desktop-1440x900.png`, `phase-3-dashboard-laptop-1280x720.png`, `phase-3-dashboard-tablet-834x1112.png`, `phase-3-dashboard-tablet-1080x810.png`, `phase-3-dashboard-mobile-390x844.png`.

## Dashboard Analytics QA

- Confirm summary cards show 24h metrics with lifetime hints and hide gracefully when analytics is unavailable (503 path).
- Verify “Analytics refreshed …” timestamp updates after `/dashboard/metrics` fetch and honors local timezone.
- Validate daily trend list renders most-recent-first, with paid/free bar segments proportional to totals.
- Check top referrers list collapses to “Direct / unknown” when hosts missing and truncates long domains without overflow.
- Ensure recent activity feed links resolve to paywalled URLs, display free/discount badges, and handle entries without referrer data.
- Webhook health card: confirm it hides when no events exist, shows 24h success/failure counts when `webhook_delivery_*` events are present, and renders error copy on 502 responses.
