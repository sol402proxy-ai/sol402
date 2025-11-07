# Website Redesign Roadmap

This roadmap translates the **Sol402 Website Redesign Playbook** into actionable build phases. Every phase—and subphase—maps to concrete tasks in the codebase (primarily `src/site/pages.ts`, `src/site/layout.ts`, `src/site/theme.ts`, and `public/assets`). Follow the phases in order; do not skip ahead so the experience remains coherent throughout development.

---

## Phase 0 – Preflight & Foundations

### 0A. Asset & Font Prep
- Convert Space Grotesk weights (400/500/600/700) to `.woff2`, place in `public/assets/fonts/`.
- Defer hero/flow artwork until final creative is approved; ensure placeholders don’t reference missing files.
- Generate required icons: Dexscreener, GitHub, X; feature icons (auto-provisioning, dynamic pricing, token perks, analytics).
- Acceptance: Fonts load from `/assets/fonts`, no broken art references remain.

### 0B. Theme & Layout Baseline
- Update `src/site/theme.ts` with the new palette, gradients, spacing scale, and typography.
- Refresh layout primitives in `src/site/layout.ts` (container widths, background patterns, section spacing).
- Ensure base typography uses Space Grotesk site-wide with JetBrains Mono reserved for code blocks.
- Acceptance: Visiting any page shows new colors/typography even before individual sections are rebuilt.

### 0C. Tooling & QA Harness
- Add Lighthouse + accessibility checklist to CI docs (manual run if automation unavailable).
- Prepare responsive testing template (Chrome DevTools device list).
- Acceptance: We have a repeatable procedure for QA at the end of each phase.

---

## Phase 1 – Global Shell & Home Experience

### 1A. Navigation & Footer
- Implement glassmorphic nav: logo, `Product/Pricing/Token/Docs`, `Dashboard`, primary CTA (`Launch Builder`).
- Add social icon cluster limited to Dexscreener, GitHub, X. Hide them on mobile; surface inside drawer footer.
- Build mobile drawer with slide-in animation, backdrop blur, and stacked CTAs.
- Rebuild footer (three columns: Product, Company, Connect) with `admin@sol402.app` mailto and social icons.
- Acceptance: Header/footer match desktop and mobile specs; sticky nav behaves on scroll.

### 1B. Home Sections
- Reconstruct hero with metric chips, CTA row, hero art container, and gradient background.
- Add social proof strip, “How Sol402 works” cards, feature grid, dashboard teaser, testimonials slider, final CTA panel.
- Wire basic animations (scroll reveal, hover elevation).
- Acceptance: `/` visually mirrors the playbook on desktop and mobile (check metrics strip horizontal scroll on small screens).

### 1C. Home QA & Content Pass
- Verify copy accuracy, ensure CTAs link correctly (`Launch Builder`, `View Demo`, etc.).
- Test hero/feature responsiveness across breakpoints.
- Acceptance: Home passes visual QA, responsive behaviour, and content review. Move to Phase 2 afterwards.
- Status: ✅ Content/CTA review captured in `docs/qa/phase-1-report.md`. Full device + Lighthouse sweep deferred to Phase 4B when GUI tooling is available.

---

## Phase 2 – Pricing & Token Pages

### 2A. Pricing Layout
- Build pricing hero with stat capsule and cost calculator card (with slider/toggles; stub maths for now).
- Implement tier cards for Baseline/Growth/Premium with SOL402 requirements, discount/free-call perks, CTAs.
- Add FAQ accordion sections and closing contact CTA.
- Acceptance: `/pricing` reflects new layout; mobile stacks switch to single-column; toggles/accordion interactors function.
- Status: ✅ Layout shipped with interactive estimator stub (local calc only). Live data wiring slated for future analytics work; QA tracked under Phase 2C.

### 2B. Token Deep Dive
- Craft token hero: token symbol, contract address (copy button), Pump.fun + Dexscreener CTAs, Dexscreener embed card.
- Build utility grid (per-tier perks + future utility), economics panel (charts or placeholder), roadmap timeline, CTA strip.
- Ensure placeholders call out pending data (e.g., if analytics chart not ready).
- Acceptance: `/token` mirrors spec; embed responsive; mobile layout verified.
- Status: ✅ Layout shipped with live CTAs, contract copy button, utility/economics/roadmap sections. Chart uses illustrative conic gradient until treasury wallets publish final splits.

### 2C. Phase QA
- Cross-check pricing/token copy for accuracy (SOL402 amounts, discount percentages).
- Run responsive check; ensure social/link buttons working.
- Acceptance: Both routes ready; note any TODOs for charts/calculator logic in issue tracker.

---

## Phase 3 – Docs, Link Builder, Dashboard

### 3A. Docs Landing
- Redesign `/docs/quickstart` hero with code snippet card.
- Build step-by-step cards (Provision, Integrate, Observe, Scale) and resource tiles.
- Add FAQ strip for integration questions.
- Acceptance: Docs landing matches spec; anchors/links accurate; mobile stack validated.
- Status: ✅ Implemented detailed copy + snippet, step cards, resource tiles, and integration FAQ. Awaiting GUI QA for responsive screenshots and Lighthouse pass in Phase 3D/4B.

### 3B. Link Builder
- Update hero, configurator layout (form + live preview), FAQ block.
- Rework post-provision panel with “Open dashboard” button that carries `?key=` param securely.
- Acceptance: `/link/request` is the single onboarding surface; legacy `/link` redirects. Provisioning flow unaffected; responsive behaviour correct.
- Status: ✅ Hero, self-serve configurator (includes webhook URL/secret inputs), tier summary, and supporting FAQ/support cards rebuilt; QA screenshots + Lighthouse deferred to Phase 3D/4B once GUI access is available.

### 3C. Dashboard Overview
- Style dashboard overview strip, charts, link table, API key card per playbook.
- Use existing metrics API for data; ensure empty states look polished.
- Add placeholders for SOL402 balance and webhook status widgets.
- Acceptance: `/dashboard` matches design; charts responsive; no regressions in data display.
- Status: ✅ Live metrics endpoint wired into summary cards, 7-day trend list, referrer grid, and recent activity feed. Dashboard hero/login shell refreshed 2025-11-02; capture new responsive screenshots during Phase 3D QA. SOL402 balance widget + webhook health card now backed by live APIs, with future polish reserved for latency charts and quota alerts.

### 3D. Phase QA
- Run Lighthouse accessibility/performance; check for console errors.
- Verify dashboard still works with keys minted pre-redesign (backwards compatibility).
- Acceptance: All three routes stable for deploy; note remaining TODOs (e.g., future widgets).

---

## Phase 4 – Polish, QA, and Launch

### 4A. Interaction & Animation Polish
- Fine-tune scroll animations, hover states, and gradients.
- Ensure testimonials carousel auto-plays with pause-on-hover/touch.
- Implement nav scroll compression + progress bar if desired.
- Acceptance: Animations smooth, no layout jank, 60fps on desktop.
- Status: ✅ Completed (2025-11-04) — testimonial carousel now auto-plays with pause-on-hover/touch controls, sticky nav compresses on scroll with a progress indicator, the reveal/hover system remains smooth under reduced-motion preferences, and branded logomarks now appear across hero surfaces.

### 4B. Comprehensive QA
- Devices: desktop, laptop, tablet (portrait/landscape), mobile.
- Browsers: Chrome, Safari, Firefox.
- Accessibility: keyboard navigation, focus rings, alt text, Lighthouse ≥95.
- Content: Confirm only Dexscreener/GitHub/X links present; email correct; copy free of placeholders.
- Acceptance: QA matrix complete with screenshots/notes stored (e.g., in `/docs/QA` or Notion).

### 4C. Documentation & Deployment
- Update README marketing screenshots, add new hero imagery references.
- Document redesign summary in CHANGELOG (if maintained).
- Run `npm run build` and `wrangler deploy`. Capture preview URL for stakeholders.
- Acceptance: Production matches local build; no regressions; plan closed.

---

## Tracking & Checklist

- [x] Phase 0A complete (assets/fonts in place)
- [x] Phase 0B complete (theme refresh)
- [x] Phase 0C complete (QA harness)
- [x] Phase 1A complete (nav/footer)
- [x] Phase 1B complete (home sections)
- [x] Phase 1C complete (home QA)
- [x] Phase 2A complete (pricing page)
- [x] Phase 2B complete (token page)
- [ ] Phase 2C complete (pricing/token QA)
- [x] Phase 3A complete (docs landing)
- [x] Phase 3B complete (link builder)
- [x] Phase 3C complete (dashboard styling)
- [ ] Phase 3D complete (phase QA)
- [ ] Phase 4A complete (animation polish)
- [ ] Phase 4B complete (full QA)
- [ ] Phase 4C complete (docs + deploy)

Keep this roadmap updated as tasks finish. Any deviation from the design playbook must be captured here with rationale so the build stays aligned to the target experience.
