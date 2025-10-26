0. Mission

Build Sol402 Proxy: a minimal service that turns any origin URL or API into a pay‑per‑request endpoint using the x402 protocol with USDC‑SPL on Solana.
Creators paste an origin URL → we return a short /p/:id paywalled link.
Buyers (humans or agents) pay via x402; on success we proxy the origin response.

Success criteria

Issue a correct HTTP 402 challenge and accept paid retries with X-PAYMENT; return resource + X-PAYMENT-RESPONSE on success.
GitHub

Default price $0.005 USDC per fetch; per‑link overrides.

Solana network support from day one (USDC‑SPL).

Token perks (Pump.fun token): holder discount 25% or N free calls/day (configurable).

Clean, testable TypeScript code; end‑to‑end tests that simulate the 402 flow.

Non‑goals (MVP)

Subscriptions, metering beyond “exact” per‑call.

Origin auth adapters (API keys, OAuth) — out of scope for v1.

Multi‑chain routing (we’ll ship Solana first).

1. Tech choices (pre‑decided)

Runtime: Node 20+ (dev), optional Cloudflare Workers for deploy.

HTTP framework: Hono (tiny, fast; Workers‑friendly).

x402 server middleware: x402-hono package.
npmjs.com

Facilitator (prod): https://facilitator.payai.network (Solana‑first, multi‑network).
PayAI

Token checks (Solana): @solana/web3.js + @solana/spl-token or simple JSON‑RPC calls.

Tests: Vitest + Supertest.

Store: In‑memory for dev; switchable to KV/R2 later.

Formatting: Prettier; lint: ESLint.

2. Repository map (Codex: create these)
   .
   ├── src/
   │ ├── server.ts # Hono app bootstrap
   │ ├── routes/
   │ │ ├── paywall.ts # GET /p/:id (402 → verify/settle → proxy)
   │ │ └── admin.ts # POST /admin/links (create link), GET /healthz
   │ ├── lib/
   │ │ ├── x402.ts # x402-hono wiring, price resolution
   │ │ ├── token.ts # SPL token balance checks (discount/free quota)
   │ │ ├── proxy.ts # Origin fetch with headers allowlist
   │ │ └── store.ts # Link store (in-memory; interface for KV)
   │ │ └── store-workers.ts # Cloudflare Workers KV adapter
   │ └── types.ts
   ├── tests/
   │ ├── e2e.402-flow.test.ts # 402 → paid retry → 200 OK
   │ ├── token-discount.test.ts # price reduction for holder
   │ └── security.test.ts # header sanitization, deny-lists
   ├── .env.example
   ├── package.json
   ├── tsconfig.json
   ├── vitest.config.ts
   ├── README.md
   └── AGENTS.md # this file

3. Environment & config

Create .env (Codex: also add .env.example with these keys):

# x402 / payments

NETWORK=solana # or solana-devnet for tests
FACILITATOR_URL=https://facilitator.payai.network
MERCHANT_ADDRESS=<your_solana_wallet_address> # where USDC arrives
USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Pricing

DEFAULT_PRICE_USD=0.005 # default per request
PRICE_DECIMALS=6 # USDC decimals

# Token perks (SOL402 Pump.fun token)

TOKEN_MINT=HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump # SOL402 Pump.fun mint address
TOKEN_HOLDER_THRESHOLD=2000000 # min tokens to qualify for the 25% discount (≥2M tokens)
HOLDER_DISCOUNT_BPS=2500 # 25% discount
FREE_CALLS_PER_WALLET_PER_DAY=5 # daily quota granted to eligible wallets
FREE_CALLS_TOKEN_THRESHOLD=1000000 # free-call quota unlocks at ≥1M tokens

# Admin

ADMIN_API_KEY=<random-string> # for POST /admin/links

# Observability (optional)
SOLANA_RPC_URL=<extrnode_rpc_endpoint> # keep private; use Extrnode mainnet URL
RPC_METRICS_URL=<metrics_sink_endpoint>
RPC_METRICS_AUTH_HEADER=<bearer-or-api-key>
ANALYTICS_SINK_URL=<clickhouse_or_bigquery_ingest>
ANALYTICS_SINK_AUTH_HEADER=<optional-auth>

USDC mint reference (Solana).
Solscan

4. How the system works
   Request flow (happy path)
   Client → GET /p/:id
   Server → 402 Payment Required (JSON for API clients; branded HTML paywall with facilitator CTA for browsers)
   { x402Version, accepts: [{ scheme: "exact", network: "solana",
   asset: USDC_MINT, payTo: MERCHANT_ADDRESS,
   maxAmountRequired, timeout }] }
   Client → pays per facilitator → retries with header:
   X-PAYMENT: <base64 payload>
   Server → verify + settle via FACILITATOR_URL → 200 OK (proxied origin)
   X-PAYMENT-RESPONSE: <base64 receipt>

402 challenge / X-PAYMENT / facilitator /verify+/settle semantics.
GitHub

Seller quickstart (middleware + facilitator URL config).
Coinbase Developer Docs

Hono middleware (x402-hono) for minimal wiring.
npmjs.com

PayAI facilitator (Solana support).
PayAI

Pricing & token perks

Price resolver returns a USDC atomic amount from DEFAULT_PRICE_USD or per‑link override.

If wallet holds ≥ FREE_CALLS_TOKEN_THRESHOLD and quota remains, short‑circuit payment (return 200 with X-PAYMENT-RESPONSE: free-quota).

If caller wallet holds ≥ TOKEN_HOLDER_THRESHOLD, apply HOLDER_DISCOUNT_BPS to the price.

5. Commands Codex should use

Codex: prefer these commands; don’t invent new tools without updating this section.

Install & run
npm i
npm run dev # ts-node/tsx, hot reload
npm run build # tsc
npm run start # node dist/server.js

Test & lint
npm t # vitest
npm run test:watch
npm run lint && npm run format

Dev helpers

# Seed one sample link with a per-link price override

curl -X POST http://localhost:4021/admin/links \
 -H "X-Admin-Key: $ADMIN_API_KEY" \
 -H "Content-Type: application/json" \
 -d '{"origin":"https://httpbin.org/json","priceUsd":0.01}'

6. Implementation plan (tasks for Codex)

Work top‑down; keep changesets small and tested.

A. Bootstrap & plumbing

Init Hono server (src/server.ts) and wire GET /healthz.

Implement store.ts (in‑memory Map<string, Link>; fields: id, origin, priceUsd?, createdAt).

admin.ts: POST /admin/links (auth via X-Admin-Key), GET /admin/links/:id.

B. x402 paywall

Add x402-hono middleware in lib/x402.ts with:

NETWORK, FACILITATOR_URL, MERCHANT_ADDRESS, USDC_MINT.

Route config to protect /p/:id; price resolved per link.

paywall.ts route:

On paid request: fetch origin via proxy.ts, copy safe headers only (content-type, cache-control, last-modified, etag).

On unpaid request: detect browser clients (Accept text/html, Mozilla UA) and render the branded paywall page; otherwise respond with the JSON 402 challenge.

On free quota: bypass middleware and return with X-PAYMENT-RESPONSE: free-quota.

C. Token perks

token.ts: utility to:

Compute ATA for TOKEN_MINT and payerPublicKey.

Fetch SPL balance via JSON‑RPC; cache 30s.

Expose getEffectivePrice(payer) → { priceAtomic, reason } applying discount/free quota.

D. Security & robustness

Header allowlist (strip Set-Cookie, hop‑by‑hop, X-Forwarded-\* from origin).

MIME allowlist (json, text, images, pdf).

Deny internal IPs / SSRF (reject file://, localhost, private CIDRs).

Rate limits (basic token bucket per payer IP/wallet).

E. Tests

e2e.402-flow.test.ts: simulate origin server; assert 402 → then stub facilitator OK → 200 with X-PAYMENT-RESPONSE.

token-discount.test.ts: mock SPL balance → verify discounted price.

security.test.ts: SSRF blocked, headers sanitized.

F. DX & docs

README.md with curl examples (show 402 then paid 200).

.env.example complete; add wrangler.toml skeleton (optional deploy).

Simple log lines: linkId, priceAtomic, payer, status, ms.

7. Key files Codex should write (sketches)

Do not hardcode secrets. Read from process.env, validate at startup.

src/lib/x402.ts (sketch)

import { paymentMiddleware } from "x402-hono";

export function makeX402Middleware(resolvePriceForPath: (path: string, payer?: string) => Promise<bigint>) {
const network = mustEnv("NETWORK"); // "solana" or "solana-devnet"
const facilitatorUrl = mustEnv("FACILITATOR_URL");
const payTo = mustEnv("MERCHANT_ADDRESS");
const asset = mustEnv("USDC_MINT"); // USDC-SPL mint

// Configure the middleware per-route. Price is resolved dynamically.
return paymentMiddleware(payTo, {
"/p/:id": async (c) => {
const payer = c.req.header("X-Payer") || undefined; // optional hint
const priceAtomic = await resolvePriceForPath(c.req.path, payer);
return { price: priceAtomic, network, asset };
},
}, { url: facilitatorUrl });
}

Middleware + facilitator are standard per seller quickstart; Hono helper comes from x402-hono.
Coinbase Developer Docs
+1

src/lib/token.ts (sketch)

import { Connection, PublicKey } from "@solana/web3.js";
// optionally: @solana/spl-token for ATA helpers

export async function getSplBalance(connection: Connection, mint: string, owner: string): Promise<bigint> {
// Find ATA for (mint, owner), fetch balance via getTokenAccountsByOwner + getTokenAccountBalance
// Cache results briefly to reduce RPC load.
return BigInt(0); // implement
}

export async function getEffectivePriceAtomic(owner: string, basePriceAtomic: bigint) {
// 1) Apply free quota if available
// 2) If SPL balance >= TOKEN_HOLDER_THRESHOLD => apply HOLDER_DISCOUNT_BPS
// 3) Return { priceAtomic, reason }
}

src/routes/paywall.ts (sketch)

import { Hono } from "hono";
import { proxyFetch } from "../lib/proxy";

export const paywall = new Hono();

paywall.get("/p/:id", async (c) => {
const { id } = c.req.param();
const link = await c.get("store").get(id); // created via /admin/links
if (!link) return c.text("Link not found", 404);

// At this point, request is either paid/settled (middleware) or on free quota
const resp = await proxyFetch(link.origin, c.req);
// Copy safe headers and return
return new Response(resp.body, {
status: resp.status,
headers: filterHeaders(resp.headers),
});
});

8. Testing strategy (what Codex should run)

Current suite (as of 0.1):

- Unit: `tests/lib/pricing.test.ts`, `tests/lib/token.test.ts`, `tests/lib/security.test.ts`, `tests/lib/rate-limit.test.ts`.
- Integration: `tests/paywall.test.ts` (402 challenge metadata, free quota path, unsafe origin + MIME guard).
- End-to-end: `tests/e2e.402-flow.test.ts` (mock facilitator response, verifies paid retry and header sanitisation).

Run with:

    npm t

9. Deployment (optional, but scaffold)

Cloudflare Workers: add wrangler.toml and npm run deploy. Hono supports Workers seamlessly.

Keep a simple Node npm run start for bare‑metal/VPS.

10. Operational rules for Codex

Never commit secrets. Read from .env; add .env to .gitignore.

Confirm external effects before running (file writes, network calls).

Prefer small PRs with passing tests.

When uncertain about external APIs, cite the relevant docs inside code comments with a short URL preview and a reference back to this AGENTS.md.

Use descriptive logs (no PII).

Follow TypeScript strict; no any unless justified in a comment.

11. Product copy (README snippets Codex can paste)

What is Sol402 Proxy? Pay‑per‑request links for any URL or API, powered by x402 over HTTP 402 Payment Required. Works great for agent‑to‑agent APIs.
Coinbase Developer Docs

Why Solana + USDC? Fast finality, low fees, and broad wallet support. We price in USDC‑SPL by default.
Solscan

How it works: The first request returns 402 with machine‑readable PaymentRequirements. Pay it (client libs or facilitator UX), retry with X‑PAYMENT, get the content.
GitHub

12. Reference links (for humans & Codex)

Codex CLI + AGENTS.md (official): how Codex reads this file; MCP for tools.
OpenAI Developers
+2
OpenAI
+2

x402 overview/spec (Coinbase & docs): protocol flow; facilitator; seller quickstart.
Coinbase Developer Docs
+2
GitHub
+2

x402‑hono (middleware): npm & quickstart.
npmjs.com
+1

PayAI facilitator (Solana‑first): facilitator URL & onboarding.
PayAI
+1

USDC on Solana (mint address).
Solscan

Cloudflare Agents x402 (background).
Cloudflare Docs

13. Open tasks queue (keep this updated)

- Cron monitoring: add CI coverage (or dashboard alerting) that ensures scheduled analytics exports run successfully in production.
- Grafana dashboards: build panels/alerts for the Loki-hosted RPC metrics (latency, retries, failures) once the SOL402 CA is live and traffic flows.

14. GTM Pages (Add‑On)

Codex: create a lightweight marketing site (any framework—Next.js, Astro, or plain HTML). Use the copy below verbatim unless noted. Add the routes and files as specified. All pages share the global header/footer.

14.1 Route map
/ → Home (overview)
/api → Paywall your API (dev funnel)
/link → Paywall your Link (creator funnel)
/pricing → Pricing
/docs/quickstart → Quickstart (one-pager)
/token → Token utility & perks
/faq → FAQ
/legal/terms → Terms (stub)
/legal/privacy → Privacy (stub)
/changelog → Changelog (stub)
/status → Status (external link or placeholder)

14.2 Global elements

Header nav: Logo (text: “Sol402”), Docs, Pricing, API, Link, Token, Launch App (primary CTA).
Footer: © Sol402, Terms, Privacy, Contact: admin@sol402.app.

Primary CTA text: Create a paywalled link
Secondary CTA text: Read the docs

14.3 Page copy blocks (ready‑to‑paste)

Each block includes optional Front‑matter (if your site generator uses it).

A) / — Home

Front‑matter

title: Sol402 — Turn any URL or API into a pay‑per‑request endpoint
description: Drop‑in paywalls for the agent economy. x402-native payments using USDC on Solana. No accounts, no API keys—just HTTP 402.
og_title: Pay‑per‑request for anything on the web
og_description: x402-native payments. USDC on Solana. Ship in minutes.

Hero

Headline: Pay‑per‑request for anything on the web
Subhead: Add a 402 Payment Required challenge to any URL or API. Get paid in USDC on Solana. No accounts, no keys—just HTTP.
Primary CTA: Create a paywalled link
Secondary CTA: Read the docs
Trust bar: x402‑native • Solana USDC • Agent‑ready

3 Value props

• x402‑native: Standard 402 → pay → retry flow.
• Solana‑fast: Low fees, instant settlement in USDC‑SPL.
• Frictionless: Works with bots, agents, or browsers.

How it works (3 steps)

1. You add a source: paste a URL or pick an endpoint.
2. We answer requests with 402 + PaymentRequirements.
3. After payment, we proxy the origin response 1:1.

Code teaser (curl)

# Request a paid endpoint

curl -i https://sol402.app/p/abc123

# → HTTP/1.1 402 Payment Required

# {

# "x402Version": 1,

# "accepts": [{

# "scheme": "exact",

# "network": "solana",

# "asset": "<USDC_MINT>",

# "payTo": "<MERCHANT_ADDRESS>",

# "maxAmountRequired": "5000", # 0.005 USDC with 6 decimals

# "maxTimeoutSeconds": 60

# }]

# }

# After paying, retry with your payment header

curl -H "X-PAYMENT: <base64-payload>" https://sol402.app/p/abc123

# → 200 OK + X-PAYMENT-RESPONSE

Token perk blurb

Hold ≥1M SOL402 for 5 free calls/day. Stack ≥2M to unlock a 25% discount. Token CA: `HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump`.

Mini‑pricing

Starts at $0.005 per request. No monthly fees.

Footer disclaimer

Sol402 provides infrastructure only. Do not proxy illegal or infringing content. Token has utility only and no expectation of profit.

B) /api — Paywall your API (Dev Funnel)

Front‑matter

title: Paywall your API with x402 in minutes
description: Add a standard HTTP 402 flow to your endpoints. Get paid in USDC on Solana with one middleware.
og_title: Add x402 to your API
og_description: Standard 402 → pay → retry. USDC on Solana. Works with agents.

Hero

Headline: Add x402 to your API in minutes
Subhead: Expose any endpoint behind a standard 402 challenge. Verified payment → we forward the request to your origin.
Primary CTA: Read the quickstart
Secondary CTA: Launch App

Checklist

□ Hono/Node middleware
□ Solana network (USDC‑SPL)
□ Works with agents & bots
□ No API keys required

Implementation snapshot

// Configure price & network (Solana)
paymentMiddleware(payTo, {
"/p/:id": async (c) => ({ price: 5000, network: "solana", asset: process.env.USDC_MINT })
}, { url: process.env.FACILITATOR_URL })

Dev benefits

• Simple: You focus on your API; we handle 402, verify & settle.
• Agent‑ready: No UI flow required—just HTTP headers.
• Flexible: Per‑link pricing, discounts for token holders.

CTA row

[View examples] [Copy curl] [Open docs]

C) /link — Paywall your Link (Creator Funnel)

Front‑matter

title: Paywall any link — files, pages, downloads
description: Paste a link, set a price, share the paywalled URL. Get paid in USDC on Solana.
og_title: Paywall your link in one click
og_description: Share premium links and get paid per view with x402.

Hero

Headline: Paywall any link
Subhead: Paste a URL, set a price, get a /p/ short link. Visitors pay a few cents to access.
Primary CTA: Create a paywalled link
Secondary CTA: See pricing

Simple form copy

Origin URL: [ https://example.com/my.pdf ]
Price per access (USDC): [ 0.01 ]
[ Generate link ]

Notes

• We proxy your content after payment.
• Supported types: pages, JSON, images, PDFs, small files.
• Please respect copyright and local laws.

D) /pricing

Front‑matter

title: Pricing — simple per‑request
description: Pay only when someone accesses your paywalled link or API.

Content

Starter: $0.005 per request
• No monthly minimums
• USDC on Solana
• Token holder perks: 5 free calls/day at ≥1M tokens, 25% off once balance reaches ≥2M tokens
Notes:
• On‑chain fees may apply.
• Large files or heavy compute may require higher per‑link pricing.

FAQ teaser

Q: Do I need an account?
A: No. It’s pure HTTP. Bring your wallet; clients can pay via x402.

E) /docs/quickstart (one‑pager)

Front‑matter

title: Quickstart — x402 in 5 minutes
description: Create a paywalled link and test the 402 flow.

Sections

1. Create a link
   POST /admin/links { origin, priceUsd }
2. Test 402
   curl -i https://sol402.app/p/<id>
3. Pay
   Use an x402 client or facilitator UI to pay the requirement.
4. Retry with X-PAYMENT
   curl -H "X-PAYMENT: <payload>" https://sol402.app/p/<id>
5. Receive content + X-PAYMENT-RESPONSE

Tip

Use solana-devnet for testing. Swap to mainnet when ready.

F) /token — Token Utility

Front‑matter

title: Token utility & perks
description: Non-financial utility for SOL402: discounts and daily free calls.

Content

Token details:
• Symbol: SOL402
• Token CA: HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump

Perks today:
• Holder discount: 25% off per-request price (hold ≥2M tokens)
• Daily free calls: 5 calls/day (hold ≥1M tokens; resets every UTC day)

How it works:
• We check your wallet’s SOL402 balance on Solana.
• Holding ≥2M tokens applies the discount automatically; hitting ≥1M tokens unlocks the daily free-call quota.

Disclosure:
• Utility terms may evolve; we’ll post updates on /changelog.

G) /faq

Questions

• What is x402?
A standard way to do payments over HTTP 402 Payment Required.

• Which chain/tokens are supported?
We support USDC on Solana first; more networks may follow.

• Do I need an account or API key?
No. It’s pay‑per‑request via HTTP.

• Can humans use it?
Yes—via wallets and facilitator UIs. Agents can pay automatically.

• Is content cached?
By default we proxy 1:1. You can set Cache-Control via your origin.

• Are there refunds?
Payments settle on-chain. Treat each access as final.

• What content is allowed?
Only legal content you have rights to share. We block abusive links.

14.4 Shared UI components (microcopy)

Banner for devs

New: Solana USDC support out of the box.

Empty state

No links yet. Create your first paywalled link.

Toasts

Link created — copy ready
Payment verified — fetching origin
Payment failed — try again or contact support

14.5 SEO & social previews

Global <head> additions

<meta name="theme-color" content="#0A0A0A">
<meta property="og:type" content="website">
<meta property="og:image" content="https://<your-domain>/og.png">
<meta name="twitter:card" content="summary_large_image">

Robots & sitemap

/robots.txt → allow all, disallow /admin
/sitemap.xml → include routes above

14.6 Analytics events (name → when)
view_home → Home loaded
click_create_link → CTA on Home or /link
link_created → /admin/links success
view_paywall → GET /p/:id returned 402 (HTML paywall rendered)
paywall_open_facilitator → Paywall CTA opened the PayAI facilitator in a new tab
paywall_copy_challenge → PaymentRequirements JSON copied from the paywall page
paywall_unlock_attempt → Unlock button pressed on the paywall form
payment_attempted → Paywall form submitted with an X-PAYMENT header
payment_verified → facilitator verify OK
payment_settled → facilitator settle OK
payment_failed → facilitator verification failed or network error surfaced in the UI
origin_fetched → proxied 200 OK
view_api → /api loaded
view_pricing → /pricing loaded
view_docs → /docs/quickstart loaded

Attach wallet, linkId, priceAtomic, network as props when available.

14.7 Launch assets (ready‑to‑ship)

A) X / Twitter (thread)

1/ Introducing Sol402 — turn any URL or API into a pay‑per‑request endpoint.

It’s x402‑native, uses USDC on Solana, and takes minutes to set up.

→ Demo: <link>

2/ Why care?
• Monetize APIs without accounts or keys
• Let agents pay automatically via HTTP
• Keep your origin as-is — we proxy after payment

3/ How it works:
• First call returns HTTP 402 + PaymentRequirements
• Client pays
• Same call retried with X-PAYMENT → 200 OK

4/ Pricing: from $0.005 per request. Token holders get perks.
Docs: <link> | App: <link>

B) Farcaster (short cast)

Shipping Sol402 — x402 paywalls for links & APIs (USDC on Solana).
Paste a URL, set a price, share the paywalled link.
Docs/App: <links>

C) Product Hunt listing

Name: Sol402 — Pay‑per‑request for the web
Tagline: x402‑native paywalls for links & APIs. USDC on Solana.
Intro comment (maker):
We built the easiest way to charge per request using the 402 standard.
Paste a link or wrap an API; agents and browsers can pay in a single hop.
Happy to hear feedback!

D) Update email (early users)

Subject: Your link can charge per view now (Sol402 live)

We’re live. Create a paywalled link, set a price, and get paid in USDC on Solana.
Quickstart: <link>
Questions? Reply here — we read every message.

14.8 Experiments (A/B ideas)
• Hero headline: “Pay‑per‑request” vs “Monetize your API in 5 min”
• CTA: “Create link” vs “Launch app”
• Price anchor: show $0.005 vs “from $0.005”
• Perk framing: “25% off for holders” vs “5 free calls/day for holders”

14.9 Legal & safety stubs

Terms (stub)

You may not proxy illegal, infringing, or harmful content. All payments are final once settled on-chain. We reserve the right to disable abusive links.

Privacy (stub)

We log minimal metadata to operate the service (timestamps, linkId, status codes). We do not sell personal data.

Token disclaimer

SOL402 provides utility only (discounts, quotas). It does not represent an investment or claim on revenue. No expectation of profit. Token CA: HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump.

14.10 Implementation checklist for Codex (site)

Generate routes and pages above with the provided copy.

Add global header/footer and analytics event hooks.

Include og.png placeholder and sitemap/robots.

Wire “Launch App” buttons to the dashboard or link‑builder UI.

Add /changelog entry “Public beta launch”.

14.11 Paywall challenge response

- `/p/:id` should always answer with HTTP 402 and the JSON PaymentRequirements payload, regardless of `Accept` or user agent. Browsers and agents follow the same flow: fetch → pay → retry with `X-PAYMENT`.
- Continue emitting the server-side analytics events (`view_paywall`, `payment_attempted`, `payment_verified`, `payment_settled`, `payment_failed`, `origin_fetched`) based on request handling; no additional browser UI is required.
