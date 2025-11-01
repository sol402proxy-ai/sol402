# Sol402 Website Redesign Playbook

We are rebuilding sol402.app to mirror the polish and flow of https://lumen.onl while keeping the Sol402 story, copy, and product structure. This document is the canonical plan for that effort. Treat it as a build brief: every section below translates directly into implementation tasks.

---

## 1. Visual North Star

- **Reference audit**: Lumen leans on a 12-column, 1200px max-width grid, deep navy gradients, and conversational copy. We mirror spacing, card layering, and scroll rhythm—not their content.
- **Color system**:
  - Base: `#0B1224` (site background), `#060A13` (alternate sections).
  - Accent 1: `#0CE5FF` (primary CTAs, focus states).
  - Accent 2: `#5F6AFF` (secondary CTAs, dividers).
  - Soft text: `#F4F7FF` at 88% opacity for body copy.
  - Gradient recipe for hero: `radial-gradient(142% 120% at 92% 12%, rgba(95,106,255,0.28), rgba(12,229,255,0.08) 46%, rgba(6,10,19,1) 100%)`.
- **Typography**:
  - `Space Grotesk` weights 400/500/600/700 for all UI copy.
  - Fluid scale: `h1 clamp(2.8rem, 3.8vw, 4.4rem)`, `h2 clamp(2rem, 2.6vw, 3.2rem)`, `body clamp(1rem, 1.3vw, 1.15rem)`, `small 0.95rem`.
  - `JetBrains Mono` for code/metrics at `0.95rem` with 150% line-height.
  - Host `.woff2` files locally, preload critical weights, fallback chain: `Space Grotesk, Inter, 'Segoe UI', sans-serif`.
- **Imagery & iconography**:
  - Hero illustration and flow diagram are temporarily deferred; reintroduce updated assets before Phase 4 polish.
  - Icon set (auto-provisioning, dynamic pricing, token perks, analytics) should maintain 48×48 sizing and gradient fills.
  - Create icon set (48×48) for Auto-provisioning, Dynamic pricing, Token perks, Analytics. Style with 1.5px strokes, rounded corners, gradient fills (Accent 1 → Accent 2).
- **Micro copy tone**: Punchy, confident, <16 words per sentence. Headline + support pattern: “Headline.” / “Two-sentence support copy.”

---

## 2. Global Shell

- **Navigation**:
  - Desktop height 72px, mobile 64px. Fixed top with backdrop blur (`backdrop-filter: blur(16px)`).
  - Left: logo (36×36) + wordmark. Center: `Product`, `Pricing`, `Token`, `Docs`. Right: `Dashboard` button + `Launch Builder` primary CTA. Social icons (Dexscreener, GitHub, X) sit next to CTAs; hide on mobile.
  - On scroll, nav compresses to 60px, border `rgba(12,229,255,0.12)`, background `rgba(6,10,19,0.82)`.
- **Hero canvas**:
  - Base gradient described above + grid overlay (SVG 20×20, opacity 0.08, rotated 8°).
  - Hero content sits within a glass panel `background: rgba(15,26,45,0.55); border: 1px solid rgba(244,247,255,0.08); border-radius: 24px; padding: 32px`.
  - Add blurred orb behind hero art (CSS radial gradient, animate scale 96%→104% over 8s).
- **Buttons**:
  - Primary: background `#0CE5FF`, text `#051423`, box-shadow `0 14px 30px rgba(12,229,255,0.32)`, hover lighten by 8%, move up 2px.
  - Secondary: border `1px solid rgba(95,106,255,0.6)`, background `rgba(95,106,255,0.1)`, hover `rgba(95,106,255,0.22)`.
  - Ghost: text `rgba(244,247,255,0.76)`, underline on hover.
- **Footer**:
  - Three columns: `Product`, `Company`, `Connect`. Include email `admin@sol402.app`.
  - Social icons repeated (Dexscreener, GitHub, X) 44×44 buttons.
  - Background gradient inverted (darker base).
- **Responsive breakpoints**:
  - Desktop ≥1280px (max-width 1160px, 48px horizontal padding).
  - Tablet 768–1279px (max-width 720px, hero stacks, navigation collapses to hamburger).
  - Mobile ≤767px (single column sections, sticky nav with condensed menu, CTAs full width).

---

## 3. Page-by-Page Duplication Plan

### Mobile Experience Parity

Every page must faithfully mirror Lumen’s mobile behaviours:

- **Navigation**: Collapses into hamburger; drawer slides from right with glass blur. Buttons stack vertically with primary CTA at the bottom. Social icons appear inside drawer footer.
- **Hero sections**: Re-stack into single column (copy first, media second). Metrics strip becomes horizontal scroll (`overflow-x: auto`) with snap points. CTA buttons expand to full width with 12px vertical spacing.
- **Cards & grids**: Switch from 2×2/3×1 layouts to stacked cards with 24px spacing. Maintain gradient borders and drop shadows.
- **Accordions & FAQ**: Full-width, chevron icon enlarges to 24px. Ensure tap area ≥48px.
- **Charts**: Replace side-by-side layout with vertical stack; ensure charts shrink to 320px width without clipping legends. Provide “View full analytics in dashboard” link under charts.
- **Testimonials/Carousels**: Use swipe gestures (`scroll-snap-type: x mandatory`). Show a single card with 24px horizontal padding.
- **Footer**: Collapse to single column, center-aligned text. Social icons expand to 48×48 touch targets.

Implement mobile variants alongside desktop while building each section—no deferred responsive pass.

### 3.1 Home (`/`)
**Structure**
1. **Hero (720px tall)**:
   - Left: preheader pill (“Pay-per-request for humans & agents”), headline, two-sentence support copy, CTA row (`Launch Builder`, `Watch Demo`), metric chips (Active paywalls, Avg settlement, Wallets onboarded).
   - Right: placeholder panel for future hero illustration (keep layout ready for reintroducing artwork).
2. **Social proof strip**:
   - Horizontal logo row (Solana, PayAI, Pump.fun, Dexscreener, Extrnode) with caption “Trusted by teams building the x402 economy”.
3. **How it works**:
   - Three cards laid out horizontally: `Request`, `Pay`, `Deliver`. Each card has icon, step number, headline, 2-line description, link to docs anchor.
   - Placeholder panel for future flow diagram (maintain spacing, swap with asset when available).
4. **Feature grid**:
   - 2×2 grid (Auto-provisioning, Dynamic pricing, Token perks, Real-time analytics). Each card 520×260 with gradient border, bullet list of 3 items.
5. **Dashboard teaser**:
   - Glass card pulling data from `/dashboard/metrics` (Paid requests today, Conversion, Top referrer). Include miniature chart (CSS gradient fallback, Plot.js when JS enabled).
6. **Use cases/testimonials**:
   - Slider with two cards visible; each features customer quote, wallet/role, optional logo.
7. **Final CTA**:
   - Gradient panel `Ready to gate your origin?` with `Launch Builder` + `View Docs` buttons.

**Interactions**
- Reveal on scroll (opacity 0→1, translateY 24px).
- Feature cards elevate 8px/scale 1.02 on hover.
- Testimonials auto-advance every 8s, pause on hover.

### 3.2 Pricing (`/pricing`)
**Structure**
1. **Hero**:
   - Stat capsule (“$0.005 base price • 60s settlement window”).
   - Headline `Predictable pay-per-request pricing`.
   - Two-column layout: left copy + bullet support; right calculator card (requests/day slider 0–5k, toggles for token tiers). Output: monthly cost, discount applied, free call count.
2. **Tier cards**:
   - Baseline (≥1M SOL402), Growth (≥2M), Premium (≥5M). Each card includes badge (token amount), price summary (discount %, free calls), perks list (6 bullet points), CTA (`Connect wallet` or `Contact us`).
   - Highlight middle card (Growth) with gradient border `rgba(12,229,255,0.32)`.
3. **FAQ accordion**:
   - 6 questions (Billing cadence, Dynamic pricing, Discounts, Free calls, Supported assets, Support). Each accordion displays 160–220px copy.
4. **CTA panel**:
   - Glass bar with copy `Need custom throughput or a dedicated facilitator?` Buttons: `Email admin@sol402.app`, `View token utility`.

### 3.3 Token (`/token`)
**Structure**
1. **Hero**:
   - Left: token mark, symbol, pump.fun and Dexscreener buttons, contract address with copy-to-clipboard.
   - Right: Dexscreener embed (styled card, 420×280). Provide fallback image for script-disabled scenario.
   - Stats row (price, market cap, liquidity, holders).
2. **Utility grid**:
   - Cards for Baseline/Growth/Premium perk breakdown—include free calls, discounts, link quotas, analytics unlocks. Use checklists and highlight unique features per tier.
3. **Economics**:
   - Visual (pie or stacked bar) showing allocation (Liquidity, Treasury, Ecosystem grants, Team). Provide raw numbers (supply, locked amounts). Include explanation of vesting.
4. **Roadmap**:
   - Horizontal timeline with three phases (Live, Building, Planned). Each node uses gradient connector and bullet list.
5. **CTA**:
   - Buttons: `Buy on Pump.fun`, `View on Dexscreener`, `Read Pricing`.

### 3.4 Docs Landing (`/docs/quickstart`)
**Structure**
1. **Hero**: Split layout with overview copy + two CTAs (`Read API reference`, `Download scripts`). Right card shows code snippet (Request signature + curl example) in JetBrains Mono with gradient border.
2. **Quickstart steps**: Four steps (Provision, Integrate, Observe, Scale). Each step is a card with icon, description, inline doc links.
3. **Resource tiles**: Grid linking to API reference, CLI scripts, Dashboard guide, Support email.
4. **FAQ**: smaller accordion for integration-specific questions.

### 3.5 Link Builder (`/link/request`)
**Structure**
1. **Hero**: Reinforce autoprov flow—headline `Spin up a paywall in seconds`, support copy, CTA `Connect wallet`.
2. **Configurator**: Form (origin URL, price, free call toggle, webhook). Right preview panel updates live, styled like final paywall snippet.
3. **Post-provision**: Confirmation card summarizing link details, API key, `Open dashboard` button (passes `?key=` param).

### 3.6 Dashboard (`/dashboard`)
**Structure**
1. **Overview strip**: Four KPI cards (Paid requests, Free requests, Revenue, Conversion). Include delta vs previous day.
2. **Charts**: Area chart for daily volume, bar chart for top referrers. Use Plot.js; fallback to static image.
3. **Link table**: Sortable table with link name, price, requests, status, last activity. Hover state highlights row.
4. **API key card**: Masked key display, copy button, rotation action requiring confirm modal.
5. **Upcoming widgets**: Placeholder panels for SOL402 balance, webhook status, alerts.

---

## 4. Build Sequence

1. **Infrastructure prep**
   - Convert fonts to `.woff2`, update `@font-face`.
   - (Deferred) Reintroduce hero + flow assets once final artwork ships.
   - Create icon sprite for socials (Dexscreener, GitHub, X).
2. **Global theming**
   - Update `src/site/theme.ts` with new palette + typography scale.
   - Revise layout primitives in `src/site/layout.ts` (nav, footer, grid system).
3. **Page implementation**
   - Home → Pricing → Token → Docs → Link builder (`/link/request`) → Dashboard, integrating sections above.
4. **Interactivity**
   - Scroll-trigger reveal utilities, accordion controls, chart hydration.
5. **QA & polish**
   - Cross-browser check (Chrome, Safari, Firefox).
   - Responsive snapshots (desktop/tablet/mobile).
   - Accessibility review (contrast, focus order, skip links).

---

## 6. Component Library Tasks

- Core UI: `NavBar`, `Footer`, `SectionWrapper`, `GradientCard`, `MetricChip`, `CTAGroup`, `Badge`.
- Interactive: `Accordion`, `Carousel`, `Tabs`, `SparklineChart`, `TierCard`.
- Forms: `WalletConnectButton`, `LinkConfigurator`, `ConfirmationModal`.
- Utilities: typography scale mixins, spacing tokens, gradient utilities, subtle noise overlay.

---

## 7. Copy & Content Checklist

- Update every headline/subheadline to reflect Sol402 voice; no borrowed copy.
- Prepare testimonial quotes or mark placeholders for future drop-ins.
- Keep token stats (price, supply, discount tiers) current; tie to Dexscreener data.
- Provide legal copy (Terms/Privacy) placeholders in footer if not published yet.

---

## 8. QA Matrix

- Devices: Desktop 1440×900, Laptop 1280×720, Tablet 834×1112 (portrait), 1080×810 (landscape), Mobile 390×844.
- Browsers: Chrome, Safari, Firefox latest.
- Accessibility: Lighthouse ≥95, keyboard navigation, screen reader heading order, focus rings visible.
- Performance: Hero LCP <2.5s, total JS <200KB, fonts preloaded.
- Content review: ensure Dexscreener/GitHub/X icons only, email `admin@sol402.app` correct, CTAs link to proper routes.

---

## 5. Deliverables Checklist

- [ ] Updated theme + components published in `/src/site`.
- [ ] Updated assets committed (`public/assets`).
- [ ] Content reviewed for Sol402-specific copy (no Lumen placeholders).
- [ ] Social icons limited to Dexscreener, GitHub, X across nav/footer.
- [ ] Docs + README updated to reflect new visuals once shipped.
- [ ] Deployment to staging (wrangler preview) before production push.

Follow this blueprint end-to-end to reproduce the Lumen-quality experience while keeping Sol402’s voice, pages, and token ecosystem front and center.
