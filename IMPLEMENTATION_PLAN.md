# Sol402 Implementation Plan

This plan operationalises the mandate in `AGENTS.md`. It breaks the build into ordered milestones, maps each task to concrete files, and sets crisp acceptance criteria so we can mark progress and update this document as we ship.

## Milestone 1 — Project Scaffold & Tooling

**Goals**

- Initialise a modern TypeScript workspace with Node 20, Hono, Vitest, ESLint, and Prettier.
- Capture runtime configuration via `.env` and validation helpers.

**Key Tasks**

- Generate `package.json` with scripts (`dev`, `build`, `start`, `lint`, `format`, `test`, `test:watch`).
- Create `tsconfig.json`, `vitest.config.ts`, `.eslintrc`, `.prettierrc`, `.npmrc` (save-exact), and `src/` + `tests/` folders.
- Author `.env.example` reflecting `AGENTS.md` Section 3; add runtime schema validator (`src/lib/env.ts`).
- Document bootstrap commands in `README.md` and link back to `AGENTS.md`.

**Acceptance Criteria**

- `npm run lint`, `npm run format -- --check`, and `npm t` succeed on empty scaffolding.
- Running `npm run dev` starts a placeholder Hono server responding on `/healthz`.

**Status**

- ✅ 2025-10-25 Core tooling scaffolded: npm scripts wired, TypeScript/Vitest/ESLint/Prettier configs committed, `.env.example` published, and health check available via `createApp()`.

## Milestone 2 — Core Backend Services

**Goals**

- Deliver the Sol402 proxy baseline: admin link management, paywall route, proxy pipeline.

**Key Tasks**

- Implement `src/server.ts` to compose middleware, register routes, and expose DI context (store, logger, config).
- Build `src/lib/store.ts` (in-memory map with async interface) and `src/lib/proxy.ts` (fetch origin with header allowlist + SSRF guard stubs).
- Implement `src/routes/admin.ts` (`POST /admin/links`, `GET /admin/links/:id`, `GET /healthz`) with API-key auth.
- Implement `src/routes/paywall.ts` to fetch stored link, proxy origin post-payment, and surface safe headers.
- Integrate x402 middleware via `src/lib/x402.ts`, including dynamic price resolver hook (stub returning default atomic price).

**Acceptance Criteria**

- `POST /admin/links` with valid `X-Admin-Key` stores link, returns ID; subsequent `GET /p/:id` (without payment) responds 402 via middleware stub.
- Proxy flow copies only allowed headers; responses reject invalid IDs with 404.

**Status**

- ✅ 2025-10-25 Admin + paywall backbone delivered: in-memory store, secured link creation, paywall guard returning x402-style 402 challenges, and proxied responses honoring a filtered header allowlist.

## Milestone 3 — Payment Logic, Token Perks, and Security

**Goals**

- Complete economic logic (discounts, free quota) and harden ingress.

**Key Tasks**

- Implement `src/lib/token.ts`: ATA resolution, SPL balance fetch via JSON-RPC, LRU cache, `getEffectivePriceAtomic`.
- Extend price resolver to handle per-link overrides, token discounts, free-call quotas, and descriptive reasons for logs/tests.
- Build `src/lib/security.ts` housing SSRF guard (deny private CIDRs, `file://`), MIME allowlist, and header sanitisation helpers.
- Introduce simple rate limiter (token bucket keyed by payer wallet/IP) in middleware chain.
- Add structured logging (`src/lib/logger.ts`) with context (linkId, priceAtomic, payer, latency).

**Acceptance Criteria**

- Price resolver returns correct atomic amounts for: default pricing, per-link override, discount, free quota use, and quota exhaustion cases.
- Proxy requests to private IPs or disallowed schemes are rejected with 400/403 and logged.

**Status**

- ✅ 2025-10-25 Token perks + security shipped: SPL balance-aware pricing stub with free-quota tracking, sanitized origin fetch (SSRF/IP guard + MIME allowlist), rate limiting, and structured request logging wired into the paywall.
- ✅ 2025-10-27 RPC resiliency added: Solana balance lookups now retry with exponential backoff, emit latency metrics per attempt, and surface attempt counts in logs when discounts are skipped.
- ✅ 2025-10-27 Holder perks tuned: free calls unlock at ≥1M tokens (5/day) and the 25% discount kicks in at ≥2M; copy/config updated across app + docs.

## Milestone 4 — Automated Tests

**Goals**

- Establish confidence via unit and integration suites reflecting `AGENTS.md` Section 8.

**Key Tasks**

- Write unit tests for price math, discount logic, free quota tracking, and security helpers (`tests/lib/...`).
- Implement facilitator stub helpers to simulate `/verify` + `/settle` flows.
- Create `tests/e2e.402-flow.test.ts` to assert 402 challenge, paid retry success, and header sanitation.
- Author `tests/token-discount.test.ts` and `tests/security.test.ts` per spec.
- Configure coverage thresholds (≥85%) and ensure `npm t` prints reports.

**Acceptance Criteria**

- All tests pass in CI; coverage meets thresholds.
- Failing scenarios yield actionable error messages referencing AGENTS requirements.

**Status**

- ✅ 2025-10-25 Expanded automated suite: unit coverage for pricing/token/security/rate-limit helpers, refreshed paywall specs (402 challenge, free quota, unsafe origin, MIME guard), and an end-to-end 402 flow stub verifying paid retries.
- ✅ 2025-10-27 Worker runtime smoke tests ensure `/analytics/events` ingestion and scheduled exports behave with mocked KV + R2 bindings.

## Milestone 5 — UX Surfaces & Frontend Assets

**Goals**

- Ship marketing site routes (/ , /api, /link, /pricing, /docs/quickstart, /changelog) and shared UI assets.

**Key Tasks**

- Choose frontend framework (likely Hono-rendered JSX or static site generator) consistent with repo scope; scaffold under `src/site/`.
- Implement pages with copy provided in `AGENTS.md` Section 14 (including hero, value props, CTAs, code snippets).
- Add shared layout (header/footer, trust bar, CTA buttons) and analytics hooks emitting events listed in Section 14.6.
- Generate `public/og.png` placeholder, `public/robots.txt`, and `public/sitemap.xml`.
- Wire “Launch App” CTAs to the admin/dashboard experience (once available).

**Acceptance Criteria**

- Static export/build command produces assets ready for deployment (Workers or Node).
- Analytics events fire with expected payloads in test harness.

**Status**

- ✅ 2025-10-26 Marketing site delivered via Hono views (`src/site/*`), complete with shared layout, analytics hooks, and launch assets in `public/`.
- ✅ 2025-10-27 Analytics persistence wired: `window.sol402Track` now streams events to `/analytics/events` backed by KV storage for funnel analysis.

## Milestone 6 — Documentation, Ops, and Launch Assets

**Goals**

- Finalise developer docs, operational notes, and launch collateral.

**Key Tasks**

- Update `README.md` with curl walkthrough, architecture summary, and links to docs.
- Maintain `CHANGELOG.md` (“Public beta launch”) and keep `AGENTS.md` open tasks in sync.
- Document deployment paths (Node start, Cloudflare Workers + `wrangler.toml` stub).
- Populate launch materials (Twitter thread, Farcaster cast, Product Hunt listing, email) in `docs/launch/`.

**Acceptance Criteria**

- Repository contains complete onboarding instructions; new contributors can run the project following README + this plan.
- Launch assets are reviewed and ready to publish at go-live.

**Status**

- ✅ 2025-10-26 Docs refreshed (`README.md`, `CHANGELOG.md`, `AGENTS.md`), Worker adapter + bindings landed (`src/worker.ts`, `wrangler.toml`), and launch collateral captured under `docs/launch/`.
- ✅ 2025-10-27 Worker assets moved to R2: `MARKETING_ASSETS` binding feeds `/robots.txt`, `/sitemap.xml`, and `/og.png`; README + Wrangler config updated accordingly.
- ✅ 2025-10-27 Analytics cron + observability wiring: Scheduled exporter drains `ANALYTICS_KV` to a configurable sink, RPC metrics post to `RPC_METRICS_URL`, and docs cover Extrnode setup.

## Milestone 7 — Paywall Buyer Experience (rolled back)

**Goals**

- (De-scoped) Original goal was to ship a browser-friendly 402 page; this experiment has been rolled back and `/p/:id` now always returns the JSON challenge.

**Status**

- ⛔️ 2025-10-27 Rolled back after initial experiment — paywall responses reverted to the JSON-only flow for consistency across clients; associated HTML assets/tests were removed.

## Governance & Updates

- Treat this document as the single source of truth for implementation progress. After completing any task, note the milestone/date and outcome inline (e.g., add ✅ + short note).
- If scope changes (new requirements, de-prioritised items), update relevant sections and cross-reference the decision in `AGENTS.md` Section 13 (Open tasks).
- Prioritise keeping tests and lint green; any deviation must be recorded here with rationale and follow-up ticket.
