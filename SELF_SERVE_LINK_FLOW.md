# Self-Serve Link Generator Plan

## Status
- ✅ Data model and storage extended to capture per-link merchant metadata and link requests.
- ✅ Public `/link/requests` endpoint with rate limiting, validation, and SOL402 balance checks.
- ✅ Instant provisioning: balance tiering + API key minting with no manual approval.
- ✅ Marketing page at `/link/request` with client-side validation + analytics hook.
- 🔜 Email notifications (e.g., Mailgun/Resend) to auto-acknowledge submissions.
- ✅ Dashboard UX for publishers to review auto-provisioned links without curl.

## Overview
- Goal: let external publishers request Sol402 paywalled links without handing over our merchant wallet or admin key.
- Approach: capture request details (origin URL, desired price tier, contact email, publisher’s Solana merchant address), verify SOL402 holdings, and mint links on the spot with tiered quotas + API credentials.
- Benefit: unlocks a “Spin up a paid endpoint in 60 seconds” flow we can showcase while PayAI finalises receipt verification.

## Data Model Updates
- Extend `PaywallLink` to store `merchantAddress`, `contactEmail`, and `requester` metadata.
- Persist submissions separately (KV prefix `request:`) with input validation state, tier metadata, and timestamps.
- For existing links lacking `merchantAddress`, default to the global config wallet to preserve backwards compatibility.

## Backend Changes
- Validation: require Solana address formatting for `merchantAddress`; enforce HTTPS origin whitelist using existing security guards.
- Payment requirements: swap `config.merchantAddress` for `link.merchantAddress` when building x402 routes.
- Tier automation:
  - Balance check via `TokenPerksService` to determine Baseline (≥1M), Growth (≥2M), or Premium (≥5M) tier.
  - Enforce per-tier link caps (3 / 10 / 25) before provisioning.
  - Mint hashed API keys + previews and persist quota metadata with the link.
- Admin endpoints:
  - `GET /admin/link-requests`: list auto-provisioned submissions for auditing.
- Email notifications: integrate with transactional provider (Mailgun/Sendgrid/Resend) to acknowledge submissions (pending).

## Frontend Flow
- Public page (`/link/request`):
  - Form fields: origin URL, price (preset dropdown), Solana merchant address, email, optional notes.
  - Client-side formatting hints (e.g., `Dkin…` examples).
  - On success, show the minted link, tier summary, and API key preview with instructions to copy immediately.
- Publisher dashboard (`/dashboard`):
  - Scoped API key authentication, local storage of the key (browser-only), refresh + clear controls.
  - Lifetime usage, quotas, and all `/p/` links rendered with copy buttons and tier badges.
- Marketing copy: highlight instant provisioning, tier thresholds, and the self-serve dashboard.

## Security & Abuse Controls
- Rate limit submissions per IP/email (reuse token bucket).
- Balance gate via SPL check; reject wallets below required tier.
- Future: add email confirmation + reputation scoring before minting more advanced quotas.

## Tweet / Launch Assets
- Short screen recording of filling the request form and receiving approval email.
- Thread outline:
  1. “Spin up a paid endpoint in under a minute.”
  2. Form screenshot.
  3. Payment challenge response.
  4. CTA for builders to submit their own link.

## Follow-Up Enhancements
- Email notifications and usage dashboards.
- Automated quota enforcement + analytics per API key.
- Optional custodial mode where we collect fees and remit payouts periodically.

## Outstanding Work Before Launch Announcement

### Wallet-Connect Builder
- Phantom (and Solflare fallback) connect modal surfaced on `/link/request`.
- Client-side balance check with optimistic UX while Worker confirms SPL holdings.
- Configuration view for merchant wallet + price overrides with copyable API key payload.
- Error states for insufficient balance, exceeded link cap, RPC failures.

### Publisher Dashboard
- ✅ Auth via scoped API key with browser storage toggle + refresh controls.
- ✅ Views for active links (origin, tier, quota usage) with lifetime stats and copy helpers.
- ✅ Usage counters persisted per link (paid/free calls, revenue, last payment) surfaced in the UI.
- 🔜 API key rotation and secure re-issue flow (per-wallet).
- 🔜 ClickHouse-backed charts (24h/7d aggregates) and per-request receipt browser.
- 🔜 Advanced actions: webhook configuration, priority-lane toggles, premium exports.

### Tier Perks & Integrations
- Priority RPC routing (Helius/Extrnode pools) based on tier with configurable limits.
- Webhook delivery + ClickHouse streaming for Premium tier (retry/backoff, dead-letter queue).
- Feature flags surfaced to Growth/Premium (demo toggle, analytics enrichments).

### Reliability & Ops
- Email notifications (Resend/Mailgun) for success + failure flows.
- Rate-limit dashboards + alerts for abuse monitoring.
- Automated end-to-end test suite covering wallet connect → link mint → 402 payment.
