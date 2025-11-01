## Phase 2 (Pricing & Token) – QA Prep Notes

- Home phase complete; `/pricing` now uses new hero, estimator, tier cards, FAQ accordion, and contact CTA.
- Estimator currently runs on local calculations (base rate, free calls, 25% discount). Hooking it to live analytics is tracked for later analytics work.
- Interactive pieces to verify during Phase 2C QA:
  1. Slider updates values smoothly on desktop + mobile (touch + drag).
  2. Tier toggles switch states, update aria-pressed, and recompute dollar amounts.
  3. FAQ accordion opens/closes via keyboard + pointer; arrow icon rotates.
  4. Contact CTA buttons route to `mailto:` and `/docs/quickstart`.
- Token route checklist for Phase 2C:
  1. Contract copy button fires clipboard API and announces success.
  2. Dexscreener iframe renders; fallback message visible when blocked.
  3. Utility cards stack correctly ≤767px; roadmap timeline collapses to single column.
  4. CTA buttons (`Buy`, `Launch builder`) open correct destinations.
- Responsive checks to capture once we have GUI access:
  - Desktop 1440×900, Tablet 834×1112, Mobile 390×844 screenshots of `/pricing`.
  - Confirm estimator cards stack single column ≤1023px and buttons expand at ≤767px.
  - Capture the `/token` hero + roadmap on the same device set; ensure stats grid wraps cleanly.
- Pending copy polish: replace static metric numbers once we have live analytics snapshots.
