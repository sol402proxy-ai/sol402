# QA & Accessibility Checklist

This checklist underpins Phase 0C of the Sol402 redesign roadmap. Run through it at the end of every phase and before any deploy to staging or production.

## Core Browsers
- [ ] Chrome (latest)
- [ ] Safari 17+
- [ ] Firefox 120+

Document browser/OS combos in each phase report. Note rendering anomalies, animation stutter, or font fallback differences.

## Responsive Snapshots
- Capture screenshots at:
  - Desktop 1440×900
  - Laptop 1280×720
  - Tablet 834×1112 (portrait) and 1080×810 (landscape)
  - Mobile 390×844
- Save to `docs/qa/<phase>/` with naming convention `phase-<n>-<device>.png`.

## Accessibility
- [ ] Lighthouse accessibility score ≥ 95 (Chrome DevTools)
- [ ] Keyboard navigation: logical tab order, visible focus rings, skip link
- [ ] Screen reader headings: test with VoiceOver or NVDA to confirm hierarchy
- [ ] Contrast: verify body/secondary text meets WCAG 2.1 AA thresholds

## Performance
- [ ] Lighthouse performance score ≥ 85 (3G throttling, mobile emulation)
- [ ] Largest Contentful Paint < 2.5 s
- [ ] Total JS payload < 200 KB (check in Coverage tab / build stats)

## Content Audit
- [ ] Primary CTAs route correctly (`/link/request`, `/docs/quickstart`, `/dashboard`)
- [ ] Social icons limited to Dexscreener, GitHub, X
- [ ] Default contact email `admin@sol402.app`
- [ ] No placeholders, lorem ipsum, or outdated pricing/token stats

## Deployment Verification
- [ ] `npm run build`
- [ ] `wrangler deploy --dry-run`
- [ ] `wrangler deploy`
- [ ] Spot-check production or preview URL (home, pricing, token, docs, link, dashboard)

## Reporting Template

Create a markdown file per phase (`docs/qa/phase-<n>-report.md`) using:

```
## Summary
- Status: Pass/Fail
- Highlights / blockers

## Checks
- Accessibility: …
- Performance: …
- Browsers: …
- Content: …
- Deployment: …

## Action Items
1. …
2. …
```

Archive supporting screenshots/logs alongside each report to keep the audit trail complete.
