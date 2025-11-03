import { html, raw } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import { colors, fonts, gradients, radii, shadows } from './theme.js';

type Renderable = HtmlEscapedString | Promise<HtmlEscapedString>;

export interface PageOptions {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  path: string;
  analyticsEvent: string;
  bodyClass?: string;
  content: Renderable;
}

const NAV_LINKS = [
  { label: 'Product', href: '/', analytics: 'nav_product' },
  { label: 'Pricing', href: '/pricing', analytics: 'nav_pricing' },
  { label: 'Token', href: '/token', analytics: 'nav_token' },
  { label: 'Docs', href: '/docs/quickstart', analytics: 'nav_docs' },
] as const;

const SOCIAL_LINKS = [
  {
    label: 'Dexscreener',
    href: 'https://dexscreener.com/solana/hsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump',
    analytics: 'nav_social_dex',
    tag: 'Dex',
  },
  {
    label: 'GitHub',
    href: 'https://github.com/sol402proxy-ai/sol402',
    analytics: 'nav_social_github',
    tag: 'Git',
  },
  {
    label: 'X',
    href: 'https://x.com/sol402proxy',
    analytics: 'nav_social_x',
    tag: 'X',
  },
] as const;

const globalStyles = `
@font-face {
  font-family: 'Space Grotesk';
  src: url('/assets/fonts/SpaceGrotesk-Regular.woff2') format('woff2'),
       url('/assets/fonts/SpaceGrotesk-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Space Grotesk';
  src: url('/assets/fonts/SpaceGrotesk-Medium.woff2') format('woff2'),
       url('/assets/fonts/SpaceGrotesk-Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Space Grotesk';
  src: url('/assets/fonts/SpaceGrotesk-SemiBold.woff2') format('woff2'),
       url('/assets/fonts/SpaceGrotesk-SemiBold.ttf') format('truetype');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Space Grotesk';
  src: url('/assets/fonts/SpaceGrotesk-Bold.woff2') format('woff2'),
       url('/assets/fonts/SpaceGrotesk-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
:root {
  color-scheme: dark;
  font-family: ${fonts.body};
  background-color: ${colors.background};
  background: ${colors.background};
  color: ${colors.textPrimary};
  --color-background: ${colors.background};
  --color-background-alt: ${colors.backgroundAlt};
  --color-surface: ${colors.surface};
  --color-surface-muted: ${colors.surfaceMuted};
  --color-border: ${colors.border};
  --color-text-primary: ${colors.textPrimary};
  --color-text-strong: ${colors.textStrong};
  --color-text-muted: ${colors.textMuted};
  --color-accent: ${colors.accentPrimary};
  --color-accent-soft: ${colors.accentSecondary};
  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-danger: ${colors.danger};
  --shadow-soft: ${shadows.soft};
  --shadow-glow-primary: ${shadows.glowPrimary};
  --shadow-glow-accent: ${shadows.glowAccent};
  --radius-md: ${radii.md};
  --radius-lg: ${radii.lg};
  --radius-pill: ${radii.pill};
  --surface-glass: rgba(15, 26, 45, 0.55);
  --grid-line: rgba(95, 106, 255, 0.08);
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: ${gradients.hero};
  background-attachment: fixed;
  background-repeat: no-repeat;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: ${fonts.body};
  color: var(--color-text-primary);
}
a {
  color: inherit;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
.site-header {
  border-bottom: 1px solid rgba(244, 247, 255, 0.06);
  box-shadow: 0 22px 48px rgba(5, 15, 32, 0.42);
  backdrop-filter: blur(18px);
  background: rgba(11, 18, 36, 0.85);
  position: sticky;
  top: 0;
  z-index: 30;
}
.nav-shell {
  margin: 0 auto;
  max-width: 1160px;
  padding: 1.1rem 1.75rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1.5rem;
}
.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
}
.nav-brand__logo {
  font-family: ${fonts.heading};
  font-weight: 600;
  letter-spacing: 0.12em;
  font-size: 1.2rem;
  text-transform: uppercase;
  color: var(--color-text-strong);
}
.nav-menu {
  display: inline-flex;
  align-items: center;
  gap: 1.35rem;
  font-size: 0.95rem;
}
.nav-link {
  color: var(--color-text-muted);
  transition: color 160ms ease;
  position: relative;
}
.nav-link:hover,
.nav-link:focus-visible {
  color: var(--color-text-strong);
  text-decoration: none;
}
.nav-actions {
  display: inline-flex;
  align-items: center;
  gap: 1.15rem;
}
.nav-dashboard {
  padding: 0.5rem 1.05rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(95, 106, 255, 0.32);
  background: rgba(95, 106, 255, 0.1);
  color: var(--color-text-strong);
  font-weight: 500;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-dashboard:hover,
.nav-dashboard:focus-visible {
  background: rgba(95, 106, 255, 0.2);
  border-color: rgba(95, 106, 255, 0.45);
  text-decoration: none;
}
.nav-cta {
  padding: 0.6rem 1.3rem;
  font-size: 0.95rem;
}
.nav-social {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
}
.nav-social--desktop {
  display: inline-flex;
}
.nav-social a {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(244, 247, 255, 0.12);
  background: rgba(12, 22, 42, 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: all 160ms ease;
}
.nav-social a:hover,
.nav-social a:focus-visible {
  color: var(--color-text-strong);
  border-color: rgba(12, 229, 255, 0.4);
  box-shadow: 0 10px 24px rgba(12, 229, 255, 0.25);
  text-decoration: none;
}
.nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(244, 247, 255, 0.12);
  background: rgba(12, 22, 42, 0.7);
  cursor: pointer;
  transition: all 160ms ease;
}
.nav-toggle:hover,
.nav-toggle:focus-visible {
  border-color: rgba(12, 229, 255, 0.45);
  box-shadow: 0 10px 24px rgba(12, 229, 255, 0.25);
}
.nav-toggle__bar {
  width: 18px;
  height: 2px;
  background: var(--color-text-strong);
  display: block;
  margin: 3px 0;
  transition: transform 160ms ease;
}
.nav-drawer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 220ms ease;
  z-index: 40;
}
.nav-drawer__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(7, 12, 22, 0.72);
}
.nav-drawer__panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: min(320px, 88vw);
  background: rgba(11, 18, 36, 0.96);
  border-left: 1px solid rgba(244, 247, 255, 0.06);
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 1.5rem;
  padding: 1.6rem;
  transform: translateX(12%);
  opacity: 0;
  transition: transform 220ms ease, opacity 220ms ease;
}
.nav-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-close {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(244, 247, 255, 0.1);
  background: rgba(12, 22, 42, 0.65);
  color: var(--color-text-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 160ms ease;
}
.nav-close:hover,
.nav-close:focus-visible {
  border-color: rgba(12, 229, 255, 0.45);
  box-shadow: 0 10px 24px rgba(12, 229, 255, 0.25);
}
.nav-drawer__menu {
  display: grid;
  gap: 0.9rem;
}
.nav-drawer__link {
  font-size: 1.05rem;
  color: rgba(244, 247, 255, 0.88);
  font-weight: 500;
  text-decoration: none;
}
.nav-drawer__link:hover,
.nav-drawer__link:focus-visible {
  color: var(--color-text-strong);
}
.nav-drawer__actions {
  display: grid;
  gap: 0.75rem;
}
.nav-drawer__actions .nav-dashboard {
  justify-content: center;
}
.nav-drawer__actions .button {
  width: 100%;
}
.nav-drawer__social {
  display: flex;
  gap: 0.65rem;
  justify-content: flex-start;
}
.nav-drawer__social a {
  width: 44px;
  height: 44px;
}
.nav-drawer[aria-hidden='true'] .nav-drawer__panel {
  pointer-events: none;
}
.nav-drawer[aria-hidden='true'] .nav-drawer__backdrop {
  pointer-events: none;
}
.nav-drawer[aria-hidden='false'] {
  pointer-events: auto;
}
body.nav-open {
  overflow: hidden;
}
body.nav-open .nav-drawer {
  opacity: 1;
}
body.nav-open .nav-drawer__panel {
  transform: translateX(0);
  opacity: 1;
}
.nav-toggle[aria-expanded='true'] .nav-toggle__bar:nth-child(1) {
  transform: translateY(5px) rotate(45deg);
}
.nav-toggle[aria-expanded='true'] .nav-toggle__bar:nth-child(2) {
  opacity: 0;
}
.nav-toggle[aria-expanded='true'] .nav-toggle__bar:nth-child(3) {
  transform: translateY(-5px) rotate(-45deg);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
}
main {
  flex: 1;
}
.page {
  max-width: 1160px;
  margin: 0 auto;
  padding: 4rem 1.75rem 4.5rem;
  display: flex;
  flex-direction: column;
  gap: 3.75rem;
}
.hero {
  display: grid;
  gap: 1.7rem;
}
.eyebrow {
  text-transform: uppercase;
  font-size: 0.78rem;
  letter-spacing: 0.28em;
  color: rgba(244, 247, 255, 0.64);
}
h1 {
  font-family: ${fonts.heading};
  font-size: clamp(2.8rem, 5vw, 4rem);
  margin: 0;
  line-height: 1.08;
  color: var(--color-text-strong);
  letter-spacing: 0.01em;
  font-weight: 700;
}
h2 {
  font-family: ${fonts.heading};
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  margin: 0;
  line-height: 1.15;
  color: var(--color-text-strong);
  letter-spacing: 0.015em;
  font-weight: 600;
}
h3 {
  font-family: ${fonts.heading};
  font-size: clamp(1.35rem, 2.4vw, 1.8rem);
  margin: 0;
  line-height: 1.25;
  color: var(--color-text-strong);
  letter-spacing: 0.02em;
  font-weight: 600;
}
p {
  margin: 0;
  line-height: 1.65;
  color: var(--color-text-primary);
}
.subhead {
  font-size: 1.15rem;
  color: var(--color-text-muted);
}
.hero--home {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: center;
  gap: 2.75rem;
  padding-top: 4rem;
  padding-bottom: 1.5rem;
}
.hero--pricing {
  gap: 2.25rem;
}
.hero__content {
  display: grid;
  gap: 1.8rem;
}
.hero__actions {
  margin-top: 0.5rem;
}
.hero-metrics {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.hero-metric {
  padding: 1.25rem 1.35rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.28);
  background: rgba(13, 24, 46, 0.62);
  box-shadow: 0 12px 40px rgba(5, 15, 32, 0.58);
  display: grid;
  gap: 0.35rem;
}
.hero-metric__label {
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.72);
}
.hero-metric__value {
  font-family: ${fonts.heading};
  font-size: 1.65rem;
  color: var(--color-text-strong);
}
.hero-metric__hint {
  font-size: 0.86rem;
  color: rgba(244, 247, 255, 0.7);
}
.hero__visual {
  position: relative;
  display: flex;
  justify-content: center;
}
.hero-preview {
  position: relative;
  padding: 2.25rem 2rem 2rem;
  border-radius: 28px;
  background: rgba(5, 18, 40, 0.9);
  border: 1px solid rgba(12, 229, 255, 0.24);
  box-shadow: var(--shadow-soft), var(--shadow-glow-accent);
  min-width: 340px;
  max-width: 380px;
  display: grid;
  gap: 1.8rem;
  overflow: hidden;
}
.hero-preview__art {
  margin: 0;
  padding: 0;
  position: relative;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: radial-gradient(circle at 40% 40%, rgba(12, 229, 255, 0.2), rgba(12, 22, 42, 0.88));
}
.hero-preview__art img {
  display: block;
  width: 100%;
  height: auto;
}
.hero-preview__badge {
  position: absolute;
  top: -0.9rem;
  left: 1.6rem;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(95, 106, 255, 0.4);
  background: rgba(95, 106, 255, 0.12);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(208, 249, 255, 0.92);
}
.hero-preview__card header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.75);
}
.hero-preview__card header strong {
  font-family: ${fonts.heading};
  font-size: 1.75rem;
  color: var(--color-text-strong);
}
.hero-preview__card ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}
.hero-preview__card li {
  display: flex;
  justify-content: space-between;
  font-size: 0.92rem;
  color: rgba(244, 247, 255, 0.8);
}
.hero-preview__label {
  color: rgba(244, 247, 255, 0.68);
}
.hero-preview__value {
  font-weight: 600;
  color: var(--color-text-strong);
}
.hero-preview__card footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.82rem;
  color: rgba(244, 247, 255, 0.65);
}
.hero-preview__wallet {
  font-family: ${fonts.mono};
  background: rgba(16, 30, 55, 0.6);
  padding: 0.25rem 0.55rem;
  border-radius: 10px;
  border: 1px solid rgba(12, 229, 255, 0.22);
}
.hero-preview__status {
  color: rgba(95, 106, 255, 0.85);
}
.hero-preview__glow {
  position: absolute;
  inset: -15%;
  background: radial-gradient(circle at 50% 40%, rgba(12, 229, 255, 0.18), transparent 65%);
  z-index: -1;
  filter: blur(24px);
}
.pricing-hero {
  padding-top: 5.5rem;
}
.pricing-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 3rem;
  align-items: center;
}
.pricing-hero__copy {
  display: grid;
  gap: 1.5rem;
}
.pricing-hero__actions {
  margin-top: 0.5rem;
}
.pricing-hero__capsule {
  border-radius: 28px;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: rgba(6, 12, 26, 0.86);
  padding: 2.2rem;
  box-shadow: 0 26px 56px rgba(5, 15, 32, 0.42);
  display: grid;
  gap: 1.35rem;
}
.pricing-hero__capsule header {
  display: grid;
  gap: 0.35rem;
}
.pricing-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(12, 229, 255, 0.24);
  background: rgba(12, 229, 255, 0.12);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(12, 229, 255, 0.9);
}
.pricing-hero__capsule strong {
  font-size: 2.4rem;
  font-family: ${fonts.heading};
  color: var(--color-text-strong);
}
.pricing-hero__capsule small {
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.7);
}
.pricing-hero__capsule ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
  font-size: 1rem;
  color: rgba(244, 247, 255, 0.82);
}
.pricing-hero__capsule footer p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: rgba(244, 247, 255, 0.65);
}
.pricing-estimator__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 2.4rem;
  align-items: stretch;
}
.pricing-estimator__controls,
.pricing-estimator__summary {
  border-radius: 28px;
  border: 1px solid rgba(95, 106, 255, 0.18);
  background: rgba(8, 16, 33, 0.85);
  box-shadow: 0 26px 54px rgba(5, 15, 32, 0.35);
  padding: 2.4rem;
  display: grid;
  gap: 1.65rem;
}
.pricing-estimator__controls header {
  display: grid;
  gap: 0.45rem;
}
.pricing-estimator__controls header h3 {
  margin: 0;
  font-size: 1.45rem;
}
.estimator-control {
  display: grid;
  gap: 0.65rem;
  padding: 1.4rem;
  border-radius: 20px;
  background: rgba(12, 22, 42, 0.7);
  border: 1px solid rgba(244, 247, 255, 0.08);
}
.estimator-control label,
.estimator-control__label {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(244, 247, 255, 0.68);
}
.estimator-control__value {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
}
.estimator-control__value strong {
  font-size: 2rem;
  font-family: ${fonts.heading};
  color: var(--color-text-strong);
}
.estimator-control__value span {
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.72);
}
.pricing-estimator__controls input[type='range'] {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(12, 229, 255, 0.7), rgba(95, 106, 255, 0.7));
  outline: none;
}
.pricing-estimator__controls input[type='range']::-webkit-slider-thumb {
  appearance: none;
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: #0ce5ff;
  border: 2px solid rgba(6, 12, 26, 0.9);
  box-shadow: 0 0 0 6px rgba(12, 229, 255, 0.16);
}
.pricing-estimator__controls input[type='range']::-moz-range-thumb {
  height: 18px;
  width: 18px;
  border-radius: 50%;
  background: #0ce5ff;
  border: 2px solid rgba(6, 12, 26, 0.9);
  box-shadow: 0 0 0 6px rgba(12, 229, 255, 0.16);
}
.estimator-scale {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: rgba(244, 247, 255, 0.55);
}
.tier-toggle {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
.tier-toggle__btn {
  display: grid;
  gap: 0.2rem;
  padding: 0.95rem 1.1rem;
  border-radius: 16px;
  background: rgba(8, 18, 36, 0.6);
  border: 1px solid rgba(244, 247, 255, 0.08);
  color: rgba(244, 247, 255, 0.82);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 180ms ease;
}
.tier-toggle__btn small {
  font-size: 0.82rem;
  color: rgba(244, 247, 255, 0.6);
}
.tier-toggle__btn.is-active {
  border-color: rgba(12, 229, 255, 0.4);
  background: rgba(12, 229, 255, 0.16);
  color: var(--color-text-strong);
  box-shadow: 0 18px 34px rgba(12, 229, 255, 0.18);
}
.tier-toggle__btn:hover {
  border-color: rgba(12, 229, 255, 0.36);
}
.estimator-note {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(244, 247, 255, 0.62);
}
.pricing-estimator__summary header {
  display: grid;
  gap: 0.4rem;
}
.pricing-estimator__summary header h3 {
  margin: 0;
  font-size: 1.5rem;
}
.pricing-estimator__summary dl {
  margin: 0;
  display: grid;
  gap: 0.9rem;
}
.pricing-estimator__summary dl > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem;
  color: rgba(244, 247, 255, 0.78);
}
.pricing-estimator__summary dt {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(244, 247, 255, 0.6);
}
.pricing-estimator__summary dd {
  margin: 0;
  font-family: ${fonts.heading};
  font-size: 1.15rem;
}
.pricing-estimator__summary footer {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 1.1rem;
  color: rgba(244, 247, 255, 0.7);
}
.pricing-estimator__summary footer strong {
  font-size: 2.4rem;
  font-family: ${fonts.heading};
  color: var(--color-text-strong);
}
.summary-note {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: rgba(244, 247, 255, 0.62);
}
.pricing-tiers .section__header {
  max-width: 760px;
}
.pricing-tier-grid {
  display: grid;
  gap: 1.6rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.pricing-tier-card {
  border-radius: 26px;
  border: 1px solid rgba(95, 106, 255, 0.16);
  background: rgba(10, 20, 40, 0.78);
  box-shadow: 0 28px 56px rgba(5, 15, 32, 0.36);
  padding: 2rem;
  display: grid;
  gap: 1.2rem;
}
.pricing-tier-card header {
  display: grid;
  gap: 0.45rem;
}
.pricing-tier-card header strong {
  font-size: 1.6rem;
}
.pricing-tier-card__summary {
  margin: 0;
  font-size: 1rem;
  color: rgba(244, 247, 255, 0.72);
}
.pricing-tier-card ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.55rem;
  color: rgba(244, 247, 255, 0.78);
  font-size: 0.98rem;
}
.pricing-tier-card footer {
  margin-top: auto;
}
.pricing-faq .section__header {
  max-width: 720px;
}
.faq-accordion {
  display: grid;
  gap: 1rem;
}
.faq-item {
  border-radius: 20px;
  border: 1px solid rgba(244, 247, 255, 0.1);
  background: rgba(10, 20, 40, 0.78);
  box-shadow: 0 18px 38px rgba(5, 15, 32, 0.32);
  padding: 0;
}
.faq-item summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.4rem 1.6rem;
  font-size: 1.05rem;
  color: rgba(244, 247, 255, 0.88);
}
.faq-item summary::-webkit-details-marker {
  display: none;
}
.faq-chevron {
  font-size: 1.3rem;
  transform: rotate(90deg);
  transition: transform 160ms ease;
  color: rgba(244, 247, 255, 0.5);
}
.faq-item[open] .faq-chevron {
  transform: rotate(270deg);
}
.faq-item p {
  margin: 0;
  padding: 0 1.6rem 1.6rem;
  font-size: 0.98rem;
  line-height: 1.6;
  color: rgba(244, 247, 255, 0.7);
}
.pricing-contact {
  margin: 5rem auto 0;
  max-width: 1160px;
  border-radius: 32px;
  padding: 2.8rem 3.2rem;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: radial-gradient(120% 140% at 90% 18%, rgba(12, 229, 255, 0.22), rgba(5, 12, 26, 0.92));
  box-shadow: 0 32px 60px rgba(5, 15, 32, 0.42);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}
.pricing-contact__content {
  max-width: 540px;
  display: grid;
  gap: 0.6rem;
}
.pricing-contact__content h2 {
  margin: 0;
  font-size: 1.8rem;
}
.pricing-contact__content p {
  margin: 0;
  font-size: 1rem;
  color: rgba(244, 247, 255, 0.75);
}
.pricing-contact__actions {
  display: inline-flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.token-hero {
  padding-top: 5rem;
}
.token-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 3.2rem;
  align-items: start;
}
.token-hero__copy {
  display: grid;
  gap: 1.6rem;
}
.token-hero__actions {
  margin-top: 0.5rem;
}
.token-contract {
  border-radius: 20px;
  border: 1px solid rgba(95, 106, 255, 0.16);
  background: rgba(10, 20, 40, 0.68);
  padding: 1.1rem 1.3rem;
  display: grid;
  gap: 0.6rem;
}
.token-contract__label {
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.6);
}
.token-contract__value {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
.token-contract__value code {
  font-family: ${fonts.mono};
  font-size: 0.92rem;
  background: rgba(6, 12, 26, 0.65);
  border: 1px solid rgba(244, 247, 255, 0.08);
  padding: 0.45rem 0.7rem;
  border-radius: 12px;
  color: rgba(190, 224, 255, 0.95);
  word-break: break-all;
}
.token-contract__copy {
  padding: 0.5rem 1rem;
}
.token-stats {
  display: grid;
  gap: 1.1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.token-stat {
  border-radius: 22px;
  border: 1px solid rgba(244, 247, 255, 0.1);
  background: rgba(8, 16, 33, 0.75);
  padding: 1.2rem 1.4rem;
  display: grid;
  gap: 0.5rem;
  box-shadow: 0 24px 44px rgba(5, 15, 32, 0.32);
}
.token-stat__label {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.58);
}
.token-stat__value {
  font-size: 1.8rem;
  font-family: ${fonts.heading};
  color: var(--color-text-strong);
}
.token-stat__hint {
  font-size: 0.85rem;
  color: rgba(244, 247, 255, 0.68);
}
.token-hero__dex {
  width: 100%;
}
.token-dex-card {
  border-radius: 28px;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: rgba(5, 12, 26, 0.82);
  padding: 1.8rem;
  box-shadow: 0 28px 52px rgba(5, 15, 32, 0.38);
  display: grid;
  gap: 1rem;
}
.token-dex-card header {
  display: grid;
  gap: 0.2rem;
}
.token-dex-card header span {
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.82);
}
.token-dex-card header small {
  font-size: 0.82rem;
  color: rgba(244, 247, 255, 0.58);
}
.token-dex-card__embed {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(12, 229, 255, 0.2);
  background: rgba(3, 9, 22, 0.92);
  min-height: 320px;
}
.token-dex-card__embed iframe {
  width: 100%;
  height: 320px;
  border: 0;
}
.token-dex-card__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  gap: 0.9rem;
  padding: 1.4rem;
  text-align: center;
  background: rgba(3, 9, 22, 0.92);
  color: rgba(244, 247, 255, 0.7);
}
.token-dex-card__fallback p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
}
.token-dex-card footer {
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: rgba(244, 247, 255, 0.65);
}
.token-dex-card footer code {
  font-family: ${fonts.mono};
  font-size: 0.85rem;
  color: rgba(190, 224, 255, 0.9);
  background: rgba(8, 16, 33, 0.9);
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(244, 247, 255, 0.12);
  word-break: break-all;
}
.token-utility-grid {
  display: grid;
  gap: 1.6rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.token-utility-card {
  border-radius: 26px;
  border: 1px solid rgba(95, 106, 255, 0.18);
  background: rgba(10, 20, 40, 0.78);
  padding: 2rem;
  display: grid;
  gap: 1.1rem;
  box-shadow: 0 28px 56px rgba(5, 15, 32, 0.34);
}
.token-utility-card header {
  display: grid;
  gap: 0.5rem;
}
.token-utility-card h3 {
  margin: 0;
  font-size: 1.4rem;
}
.token-utility-card ul {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.55rem;
  color: rgba(244, 247, 255, 0.78);
  font-size: 0.98rem;
}
.token-utility-card footer {
  font-size: 0.9rem;
  color: rgba(244, 247, 255, 0.65);
}
.token-economics__grid {
  display: grid;
  gap: 2.6rem;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  align-items: center;
}
.token-chart {
  position: relative;
  display: grid;
  gap: 1.4rem;
  justify-items: center;
}
.token-chart__ring {
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: conic-gradient(
    rgba(12, 229, 255, 0.7) 0 40%,
    rgba(95, 106, 255, 0.7) 40% 65%,
    rgba(45, 212, 191, 0.7) 65% 85%,
    rgba(249, 115, 22, 0.7) 85% 100%
  );
  box-shadow: 0 24px 48px rgba(5, 15, 32, 0.3);
}
.token-chart__legend {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.6rem;
  width: 100%;
}
.token-chart__legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.9rem;
  color: rgba(244, 247, 255, 0.8);
}
.token-chart__swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(244, 247, 255, 0.4);
  border: 1px solid rgba(244, 247, 255, 0.6);
}
.token-chart__legend .is-liquidity .token-chart__swatch {
  background: rgba(12, 229, 255, 0.9);
}
.token-chart__legend .is-treasury .token-chart__swatch {
  background: rgba(95, 106, 255, 0.9);
}
.token-chart__legend .is-ecosystem .token-chart__swatch {
  background: rgba(45, 212, 191, 0.9);
}
.token-chart__legend .is-team .token-chart__swatch {
  background: rgba(249, 115, 22, 0.9);
}
.token-chart__note {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(244, 247, 255, 0.6);
  text-align: center;
}
.token-economics__details dl {
  margin: 0;
  display: grid;
  gap: 1rem;
}
.token-economics__details dl > div {
  display: grid;
  gap: 0.35rem;
}
.token-economics__details dt {
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.58);
}
.token-economics__details dd {
  margin: 0;
  font-size: 1.05rem;
  color: rgba(244, 247, 255, 0.82);
}
.token-economics__note {
  margin: 1.2rem 0 0 0;
  font-size: 0.9rem;
  color: rgba(244, 247, 255, 0.68);
}
.token-roadmap__timeline {
  position: relative;
  display: grid;
  gap: 1.8rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.token-roadmap__timeline::before {
  content: '';
  position: absolute;
  inset: 50% auto auto 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, rgba(12, 229, 255, 0.5), rgba(95, 106, 255, 0.5));
  opacity: 0.3;
  pointer-events: none;
}
.roadmap-node {
  position: relative;
  border-radius: 26px;
  border: 1px solid rgba(95, 106, 255, 0.16);
  background: rgba(10, 20, 40, 0.78);
  padding: 2rem;
  display: grid;
  gap: 1rem;
  box-shadow: 0 24px 48px rgba(5, 15, 32, 0.32);
}
.roadmap-node::before {
  content: '';
  position: absolute;
  top: -14px;
  left: 24px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(12, 229, 255, 0.8);
  box-shadow: 0 0 18px rgba(12, 229, 255, 0.6);
}
.roadmap-node--building::before {
  background: rgba(95, 106, 255, 0.8);
  box-shadow: 0 0 18px rgba(95, 106, 255, 0.4);
}
.roadmap-node--planned::before {
  background: rgba(249, 115, 22, 0.8);
  box-shadow: 0 0 18px rgba(249, 115, 22, 0.4);
}
.roadmap-node__stage {
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.55);
}
.roadmap-node h3 {
  margin: 0;
  font-size: 1.4rem;
}
.roadmap-node ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.5rem;
  font-size: 0.96rem;
  color: rgba(244, 247, 255, 0.75);
}
.token-cta {
  margin: 5rem auto 0;
  max-width: 1080px;
  border-radius: 32px;
  padding: 2.6rem 3rem;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: radial-gradient(120% 140% at 90% 18%, rgba(95, 106, 255, 0.22), rgba(5, 12, 26, 0.92));
  box-shadow: 0 32px 60px rgba(5, 15, 32, 0.42);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}
.token-cta__content {
  max-width: 520px;
  display: grid;
  gap: 0.6rem;
}
.token-cta__content h2 {
  margin: 0;
  font-size: 1.8rem;
}
.token-cta__content p {
  margin: 0;
  font-size: 1rem;
  color: rgba(244, 247, 255, 0.75);
}
.token-cta__actions {
  display: inline-flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.docs-hero {
  padding-top: 5rem;
}
.docs-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 3rem;
  align-items: start;
}
.docs-hero__copy {
  display: grid;
  gap: 1.5rem;
}
.docs-hero__actions {
  margin-top: 0.4rem;
}
.docs-hero__highlights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.7);
}
.docs-hero__highlights li {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.docs-hero__snippet {
  border-radius: 26px;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: rgba(5, 12, 26, 0.85);
  padding: 1.6rem;
  display: grid;
  gap: 1rem;
  box-shadow: 0 28px 52px rgba(5, 15, 32, 0.36);
}
.docs-hero__snippet header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.78);
}
.docs-hero__snippet pre {
  margin: 0;
  padding: 1.2rem;
  border-radius: 20px;
  background: rgba(9, 18, 36, 0.78);
  border: 1px solid rgba(244, 247, 255, 0.1);
  color: rgba(210, 230, 255, 0.92);
  font-family: ${fonts.mono};
  font-size: 0.9rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.docs-steps__grid {
  display: grid;
  gap: 1.6rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.docs-step-card {
  border-radius: 26px;
  border: 1px solid rgba(95, 106, 255, 0.18);
  background: rgba(10, 20, 40, 0.78);
  padding: 2rem;
  display: grid;
  gap: 1rem;
  box-shadow: 0 24px 48px rgba(5, 15, 32, 0.34);
}
.docs-step-card__index {
  font-size: 0.85rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.55);
}
.docs-step-card h3 {
  margin: 0;
  font-size: 1.35rem;
}
.docs-step-card p {
  margin: 0;
  font-size: 0.98rem;
  color: rgba(244, 247, 255, 0.75);
}
.docs-step-card ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.45rem;
  font-size: 0.92rem;
  color: rgba(244, 247, 255, 0.68);
}
.docs-resources__grid {
  display: grid;
  gap: 1.4rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.docs-resource-card {
  border-radius: 24px;
  border: 1px solid rgba(244, 247, 255, 0.1);
  background: rgba(10, 20, 40, 0.72);
  padding: 1.6rem;
  box-shadow: 0 22px 44px rgba(5, 15, 32, 0.3);
  display: grid;
  gap: 0.8rem;
  color: inherit;
  transition: transform 180ms ease, border-color 180ms ease;
}
.docs-resource-card:hover,
.docs-resource-card:focus-visible {
  transform: translateY(-4px);
  border-color: rgba(12, 229, 255, 0.32);
  text-decoration: none;
}
.docs-resource-card header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.82);
}
.docs-resource-card header small {
  font-size: 0.82rem;
  color: rgba(244, 247, 255, 0.55);
}
.docs-resource-card p {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(244, 247, 255, 0.68);
  line-height: 1.55;
}
.docs-faq__accordion {
  display: grid;
  gap: 1rem;
}
.docs-faq__item {
  border-radius: 20px;
  border: 1px solid rgba(244, 247, 255, 0.1);
  background: rgba(10, 20, 40, 0.78);
  box-shadow: 0 20px 42px rgba(5, 15, 32, 0.32);
  padding: 0;
}
.docs-faq__item summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.4rem 1.6rem;
  font-size: 1.05rem;
  color: rgba(244, 247, 255, 0.88);
}
.docs-faq__item summary::-webkit-details-marker {
  display: none;
}
.docs-faq__item p {
  margin: 0;
  padding: 0 1.6rem 1.5rem;
  font-size: 0.96rem;
  line-height: 1.6;
  color: rgba(244, 247, 255, 0.7);
}
.link-hero {
  padding-top: 5rem;
}
.link-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  gap: 3rem;
  align-items: center;
}
.link-hero__copy {
  display: grid;
  gap: 1.5rem;
}
.link-hero__highlights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.55rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.7);
}
.link-hero__highlights li {
  display: inline-flex;
  align-items: flex-start;
  gap: 0.55rem;
}
.link-hero__panel {
  border-radius: 28px;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: rgba(5, 12, 26, 0.82);
  padding: 2rem 2.2rem;
  box-shadow: 0 26px 56px rgba(5, 15, 32, 0.38);
  display: grid;
  gap: 1.35rem;
}
.link-hero__label {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(12, 229, 255, 0.78);
}
.link-hero__stats {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.85rem;
}
.link-hero__stats li {
  display: grid;
  gap: 0.3rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.78);
}
.link-hero__stats strong {
  font-size: 1.05rem;
  color: var(--color-text-strong);
}
.link-hero__links {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}
.link-hero__links .button {
  font-size: 0.85rem;
  padding: 0.55rem 1rem;
}
.link-builder {
  margin-top: 4rem;
}
.link-builder__grid {
  display: grid;
  gap: 2.4rem;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.9fr);
  align-items: start;
}
.link-builder__main {
  display: grid;
  gap: 1.6rem;
}
.link-builder__card {
  border-radius: 26px;
  border: 1px solid rgba(95, 106, 255, 0.18);
  background: rgba(10, 20, 40, 0.78);
  box-shadow: 0 28px 56px rgba(5, 15, 32, 0.34);
  padding: 2rem;
  display: grid;
  gap: 1.2rem;
}
.link-builder__header {
  display: grid;
  gap: 0.4rem;
}
.link-builder__step {
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.55);
}
.link-builder__config .request-form {
  margin-top: 0.4rem;
}
.link-builder__aside {
  display: grid;
  gap: 1.2rem;
}
.link-builder__info {
  border-radius: 24px;
  border: 1px solid rgba(244, 247, 255, 0.12);
  background: rgba(8, 16, 33, 0.78);
  box-shadow: 0 20px 42px rgba(5, 15, 32, 0.32);
  padding: 1.6rem 1.75rem;
  display: grid;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.78);
}
.link-builder__info h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--color-text-strong);
}
.link-builder__info ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.45rem;
}
.link-builder__info pre {
  margin: 0;
  padding: 1rem;
  border-radius: 16px;
  background: rgba(9, 18, 36, 0.78);
  border: 1px solid rgba(244, 247, 255, 0.1);
  color: rgba(210, 230, 255, 0.92);
  font-family: ${fonts.mono};
  font-size: 0.85rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.link-builder__info--support a {
  color: rgba(12, 229, 255, 0.82);
  text-decoration: underline;
}
.link-builder-faq {
  margin-top: 4.5rem;
}
.link-builder-faq__accordion {
  display: grid;
  gap: 1rem;
}
.link-builder-faq__accordion details {
  border-radius: 20px;
  border: 1px solid rgba(244, 247, 255, 0.1);
  background: rgba(10, 20, 40, 0.78);
  box-shadow: 0 20px 42px rgba(5, 15, 32, 0.32);
  padding: 0;
}
.link-builder-faq__accordion summary {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.4rem 1.6rem;
  font-size: 1.05rem;
  color: rgba(244, 247, 255, 0.88);
  cursor: pointer;
}
.link-builder-faq__accordion summary::-webkit-details-marker {
  display: none;
}
.link-builder-faq__accordion p {
  margin: 0;
  padding: 0 1.6rem 1.5rem;
  font-size: 0.96rem;
  color: rgba(244, 247, 255, 0.7);
  line-height: 1.6;
}
.link-builder-support {
  margin: 5rem auto 0;
  max-width: 1080px;
  border-radius: 32px;
  padding: 2.6rem 3rem;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: radial-gradient(120% 140% at 90% 18%, rgba(95, 106, 255, 0.22), rgba(5, 12, 26, 0.92));
  box-shadow: 0 32px 60px rgba(5, 15, 32, 0.42);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}
.link-builder-support__content {
  max-width: 520px;
  display: grid;
  gap: 0.6rem;
}
.link-builder-support__content h2 {
  margin: 0;
  font-size: 1.8rem;
}
.link-builder-support__content p {
  margin: 0;
  font-size: 1rem;
  color: rgba(244, 247, 255, 0.78);
}
.link-builder-support__actions {
  display: inline-flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.cta-row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  padding: 0.7rem 1.4rem;
  font-weight: 600;
  font-size: 0.96rem;
  border: 1px solid rgba(244, 247, 255, 0.2);
  color: var(--color-text-strong);
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(10, 20, 40, 0.65);
  backdrop-filter: blur(8px);
}
button.button {
  cursor: pointer;
  font-family: ${fonts.body};
}
.button.primary {
  background: var(--color-accent);
  border-color: rgba(12, 229, 255, 0.55);
  color: #f8fafc;
  box-shadow: var(--shadow-glow-primary);
}
.button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 36px rgba(12, 229, 255, 0.45);
}
.button.secondary {
  background: rgba(8, 22, 40, 0.75);
  border-color: rgba(244, 247, 255, 0.14);
}
.button.tertiary {
  background: rgba(9, 18, 36, 0.4);
  border-color: rgba(244, 247, 255, 0.1);
  color: rgba(244, 247, 255, 0.88);
}
.button.tertiary:hover {
  background: rgba(9, 18, 36, 0.62);
  border-color: rgba(244, 247, 255, 0.2);
}
.button.copied {
  background: rgba(12, 229, 255, 0.18);
  border-color: rgba(12, 229, 255, 0.4);
  color: var(--color-text-strong);
}
.trust-bar {
  display: flex;
  gap: 0.8rem;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.9);
  flex-wrap: wrap;
}
section {
  display: grid;
  gap: 1.5rem;
}
.section {
  gap: 2.5rem;
}
.section__header {
  display: grid;
  gap: 0.9rem;
  max-width: 720px;
}
.section__subhead {
  font-size: 1.05rem;
  color: rgba(244, 247, 255, 0.72);
}

.section--social {
  padding-top: 0;
}
.social-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(95, 106, 255, 0.18);
  background: rgba(12, 22, 42, 0.7);
  box-shadow: 0 20px 40px rgba(5, 15, 32, 0.32);
}
.social-strip__label {
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.72);
}
.social-strip__logos {
  display: inline-flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.78);
}
.social-strip__logos span {
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(244, 247, 255, 0.14);
  background: rgba(12, 22, 42, 0.6);
}
.steps-layout {
  display: grid;
  gap: 1.75rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: stretch;
}
.steps-visual {
  border-radius: 24px;
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: rgba(5, 18, 40, 0.78);
  padding: 2.4rem;
  box-shadow: 0 24px 48px rgba(5, 15, 32, 0.4);
}
.steps-visual--placeholder p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(244, 247, 255, 0.78);
}
.steps-visual--placeholder span {
  display: block;
  margin-top: 0.65rem;
  font-size: 0.85rem;
  color: rgba(244, 247, 255, 0.55);
}
.section--features {
  position: relative;
}
.feature-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.feature-card {
  padding: 1.6rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(244, 247, 255, 0.08);
  background: rgba(12, 22, 42, 0.82);
  box-shadow: 0 20px 42px rgba(5, 15, 32, 0.35);
  display: grid;
  gap: 0.95rem;
}
.feature-card h3 {
  margin: 0;
  font-size: 1.35rem;
  color: var(--color-text-strong);
}
.feature-card p {
  color: rgba(244, 247, 255, 0.75);
  font-size: 0.95rem;
}
.feature-card ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.45rem;
  color: rgba(244, 247, 255, 0.72);
  font-size: 0.9rem;
}
.section--analytics {
  position: relative;
}
.analytics-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.analytics-panel {
  padding: 1.6rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(244, 247, 255, 0.08);
  background: rgba(12, 22, 42, 0.85);
  box-shadow: 0 24px 48px rgba(5, 15, 32, 0.35);
  display: grid;
  gap: 1rem;
}
.analytics-panel header {
  display: grid;
  gap: 0.5rem;
}
.analytics-panel footer {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.9rem;
  color: rgba(244, 247, 255, 0.72);
}
.analytics-panel strong {
  font-family: ${fonts.heading};
  font-size: 2rem;
  color: var(--color-text-strong);
}
.analytics-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.7rem;
  border-radius: var(--radius-pill);
  border: 1px solid rgba(95, 106, 255, 0.28);
  background: rgba(95, 106, 255, 0.16);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.78);
}
.analytics-chip--live {
  border-color: rgba(12, 229, 255, 0.4);
  background: rgba(12, 229, 255, 0.18);
  color: var(--color-text-strong);
}
.analytics-caption {
  font-size: 0.85rem;
  color: rgba(244, 247, 255, 0.6);
}
.analytics-chart {
  height: 180px;
  border-radius: 16px;
  border: 1px dashed rgba(244, 247, 255, 0.18);
  background: rgba(12, 22, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(244, 247, 255, 0.55);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}
.activity-feed {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
  font-size: 0.9rem;
  color: rgba(244, 247, 255, 0.78);
}
.activity-feed li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.activity-feed time {
  font-size: 0.8rem;
  color: rgba(244, 247, 255, 0.5);
}
.section--testimonials {
  position: relative;
}
.testimonial-strip {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.testimonial-card {
  padding: 1.6rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(244, 247, 255, 0.08);
  background: rgba(12, 22, 42, 0.78);
  box-shadow: 0 20px 42px rgba(5, 15, 32, 0.32);
  display: grid;
  gap: 1.25rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.78);
}
.testimonial-card footer {
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: rgba(244, 247, 255, 0.6);
}
.steps-grid {
  display: grid;
  gap: 1.5rem;
}
.steps-visual {
  margin: 1.5rem 0 0;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(12, 229, 255, 0.22);
  box-shadow: 0 24px 48px rgba(5, 15, 32, 0.42);
  background: rgba(5, 18, 40, 0.75);
}
.steps-visual img {
  width: 100%;
  display: block;
  height: auto;
}
.pricing-calculator {
  display: grid;
  gap: 1.5rem;
}
.pricing-calculator__panel {
  padding: 1.6rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.2);
  background: rgba(5, 18, 40, 0.85);
  box-shadow: 0 20px 42px rgba(5, 15, 32, 0.35);
  display: grid;
  gap: 1rem;
}
.pricing-calculator__panel header {
  display: grid;
  gap: 0.3rem;
}
.pricing-calculator__panel ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.6rem;
}
.pricing-calculator__panel li {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.8);
}
.pricing-calculator__label {
  color: rgba(244, 247, 255, 0.7);
}
.pricing-calculator__value {
  font-weight: 600;
  color: var(--color-text-strong);
}
.pricing-calculator__panel footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 1rem;
  color: var(--color-text-strong);
}
.pricing-calculator__panel footer strong {
  font-family: ${fonts.heading};
  font-size: 1.4rem;
}
.pricing-calculator__note {
  font-size: 0.9rem;
  color: rgba(244, 247, 255, 0.76);
  background: rgba(5, 18, 40, 0.6);
  border: 1px dashed rgba(12, 229, 255, 0.3);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.4rem;
}
.pricing-calculator__note a {
  color: rgba(147, 197, 253, 0.95);
  text-decoration: underline;
}
.pricing-tier-grid {
  display: grid;
  gap: 1.5rem;
}
.pricing-tier {
  padding: 1.6rem 1.8rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.2);
  background: rgba(5, 18, 40, 0.85);
  display: grid;
  gap: 0.8rem;
}
.pricing-tier ul {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.8);
}
.pricing-faq {
  display: grid;
  gap: 1rem;
}
.pricing-faq article {
  padding: 1.2rem 1.4rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.16);
  background: rgba(5, 18, 40, 0.78);
  box-shadow: 0 12px 32px rgba(5, 15, 32, 0.38);
  display: grid;
  gap: 0.5rem;
}
.pricing-faq h3 {
  font-size: 1.1rem;
  letter-spacing: 0.01em;
  margin: 0;
  color: var(--color-text-strong);
}
.pricing-faq p {
  font-size: 0.92rem;
  color: rgba(244, 247, 255, 0.78);
}
.step-card {
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.18);
  background: rgba(5, 18, 40, 0.82);
  box-shadow: 0 18px 40px rgba(5, 15, 32, 0.42);
  display: grid;
  gap: 0.65rem;
}
.step-card__index {
  font-family: ${fonts.mono};
  font-size: 0.95rem;
  letter-spacing: 0.2em;
  color: rgba(95, 106, 255, 0.75);
}
.step-card__body {
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.8);
}
.insight-grid {
  display: grid;
  gap: 1.5rem;
}
.insight-card {
  padding: 1.7rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.2);
  background: rgba(5, 18, 40, 0.78);
  display: grid;
  gap: 1rem;
  box-shadow: 0 20px 45px rgba(5, 15, 32, 0.38);
}
.insight-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.insight-card__metric {
  font-family: ${fonts.heading};
  font-size: 1.35rem;
  color: var(--color-text-strong);
}
.insight-card__body {
  color: rgba(244, 247, 255, 0.8);
  font-size: 0.95rem;
}
.insight-card footer {
  font-size: 0.85rem;
  color: rgba(244, 247, 255, 0.65);
}
.insight-card--code {
  grid-column: span 1;
  background: rgba(12, 22, 42, 0.92);
  border: 1px solid rgba(95, 106, 255, 0.24);
}
.insight-card--code pre {
  margin: 0;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pill--baseline {
  border: 1px solid rgba(129, 140, 248, 0.35);
  color: #c7d2fe;
  background: rgba(79, 70, 229, 0.18);
}
.pill--growth {
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #bfdbfe;
  background: rgba(37, 99, 235, 0.18);
}
.pill--premium {
  border: 1px solid rgba(249, 115, 22, 0.35);
  color: #fcd34d;
  background: rgba(234, 88, 12, 0.18);
}
.pillars-grid {
  display: grid;
  gap: 1.5rem;
}
.pillar-card {
  padding: 1.6rem 1.8rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.16);
  background: rgba(5, 18, 40, 0.85);
  box-shadow: 0 18px 40px rgba(5, 15, 32, 0.38);
  display: grid;
  gap: 0.65rem;
}
.pillar-card p {
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.76);
}
.section--token {
  position: relative;
}
.tier-grid {
  display: grid;
  gap: 1.5rem;
}
.tier-card {
  padding: 1.6rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(12, 229, 255, 0.2);
  background: rgba(5, 18, 40, 0.84);
  display: grid;
  gap: 0.75rem;
  box-shadow: 0 22px 44px rgba(5, 15, 32, 0.35);
}
.tier-card ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.5rem;
  color: rgba(244, 247, 255, 0.78);
  font-size: 0.95rem;
}
.tier-card--baseline {
  border-color: rgba(129, 140, 248, 0.35);
}
.tier-card--growth {
  border-color: rgba(59, 130, 246, 0.35);
}
.tier-card--premium {
  border-color: rgba(249, 115, 22, 0.35);
}
.token-ca {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.55rem;
  border-radius: 10px;
  background: rgba(16, 30, 55, 0.65);
  border: 1px solid rgba(95, 106, 255, 0.25);
  font-family: ${fonts.mono};
  font-size: 0.85rem;
  color: rgba(208, 249, 255, 0.9);
}
.cta-band {
  border-radius: 26px;
  padding: 2.5rem 2.25rem;
  background: ${gradients.callout};
  border: 1px solid rgba(95, 106, 255, 0.18);
  box-shadow: 0 24px 48px rgba(5, 15, 32, 0.45);
  display: grid;
  gap: 1.5rem;
  align-items: center;
}
.cta-band__content {
  display: grid;
  gap: 0.75rem;
}
.cta-band__content p {
  max-width: 560px;
  color: rgba(244, 247, 255, 0.78);
}
.cta-band__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
}
ul,
ol {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.55rem;
}
pre {
  background: rgba(15, 23, 42, 0.75);
  border-radius: 12px;
  padding: 1.25rem;
  overflow-x: auto;
  font-family: ${fonts.mono};
  font-size: 0.85rem;
  border: 1px solid rgba(59, 130, 246, 0.18);
}
pre code {
  font-family: inherit;
}
code {
  font-family: ${fonts.mono};
  color: rgba(147, 197, 253, 0.95);
}
.grid-2 {
  display: grid;
  gap: 1.5rem;
}
.demo-grid {
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 600px) {
  .steps-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pillars-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 720px) {
  .hero--home {
    grid-template-columns: 1.1fr 0.9fr;
  }
  .hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .insight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tier-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cta-band {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
  .pricing-calculator {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    align-items: start;
  }
  .pricing-tier-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pricing-faq {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 960px) {
  .steps-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .insight-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .tier-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .pricing-tier-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 820px) {
  .grid-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 900px) {
  .demo-grid {
    grid-template-columns: 1.1fr 0.9fr;
  }
}
.card {
  padding: 1.25rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(59, 130, 246, 0.18);
  scroll-margin-top: 96px;
}
.demo-card {
  display: grid;
  gap: 2rem;
}
.demo-grid {
  display: grid;
  gap: 1.5rem;
}
.demo-steps {
  display: grid;
  gap: 0.5rem;
  margin: 0 0 1.25rem;
  padding-left: 1.25rem;
}
.demo-note {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
}
.demo-controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}
.demo-log,
.demo-result {
  margin: 0.75rem 0 0;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(15, 23, 42, 0.75);
  padding: 1rem;
  min-height: 120px;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
  overflow-x: auto;
}
.demo-result--muted {
  color: rgba(148, 163, 184, 0.9);
}
.demo-faq ul {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding-left: 1.25rem;
}
.paywall-origin {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.45rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.6);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9rem;
  word-break: break-all;
}
.paywall-steps ol {
  gap: 0.5rem;
}
.paywall-form form {
  display: grid;
  gap: 0.85rem;
}
.paywall-form textarea {
  width: 100%;
  min-height: 120px;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  padding: 0.75rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.9rem;
  resize: vertical;
}
.paywall-form textarea:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.paywall-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.92);
}
.request-form {
  display: grid;
  gap: 1rem;
}
.request-form label {
  display: grid;
  gap: 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.92);
}
.request-form input,
.request-form textarea,
.request-form select {
  width: 100%;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  font-size: 0.95rem;
  font-family: ${fonts.body};
}
.request-form textarea {
  min-height: 120px;
  resize: vertical;
}
.request-form input:focus,
.request-form textarea:focus,
.request-form select:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.request-form small {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(148, 163, 184, 0.85);
}
.request-form .form-row {
  display: grid;
  gap: 1rem;
}
.request-form .form-section {
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  padding-top: 1rem;
  margin-top: 0.25rem;
  display: grid;
  gap: 0.4rem;
}
.request-form .form-section h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.92);
}
.request-form .form-section p {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.request-form .form-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.request-form-note {
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.builder-card {
  display: grid;
  gap: 1rem;
}
.builder-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.builder-note {
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.85);
}
.builder-status {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.7);
  color: rgba(226, 232, 240, 0.92);
  font-size: 0.9rem;
}
.builder-status[data-variant='success'] {
  border-color: rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.08);
  color: rgba(34, 197, 94, 0.95);
}
.builder-status[data-variant='error'] {
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.08);
  color: rgba(248, 113, 113, 0.95);
}
.builder-status[data-variant='info'] {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.08);
  color: rgba(148, 197, 255, 0.95);
}
.dashboard-hero {
  position: relative;
  margin-top: 1rem;
  padding: clamp(2.8rem, 5vw, 4rem);
  border-radius: 32px;
  border: 1px solid rgba(95, 106, 255, 0.22);
  background: radial-gradient(circle at 10% -10%, rgba(90, 213, 255, 0.25), rgba(9, 16, 38, 0.9))
      padding-box,
    linear-gradient(140deg, rgba(12, 229, 255, 0.35), rgba(67, 56, 202, 0.25)) border-box;
  box-shadow: 0 34px 80px rgba(5, 15, 32, 0.46);
  overflow: hidden;
}
.dashboard-hero::after {
  content: '';
  position: absolute;
  inset: auto -120px -140px auto;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(12, 229, 255, 0.35), transparent 65%);
  opacity: 0.6;
  filter: blur(0);
}
.dashboard-hero__inner {
  position: relative;
  display: grid;
  gap: 2.5rem;
  align-items: start;
}
.dashboard-hero__copy {
  display: grid;
  gap: 1.6rem;
  z-index: 1;
}
.dashboard-hero__metrics {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.dashboard-hero__metrics li {
  border-radius: 18px;
  border: 1px solid rgba(148, 197, 255, 0.22);
  background: rgba(7, 15, 33, 0.76);
  padding: 1.1rem 1.25rem;
  display: grid;
  gap: 0.45rem;
  box-shadow: 0 18px 42px rgba(6, 12, 28, 0.38);
}
.dashboard-hero__metrics strong {
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.82);
}
.dashboard-hero__metrics span {
  font-size: 0.92rem;
  color: rgba(244, 247, 255, 0.66);
}
.dashboard-hero__panel {
  position: relative;
  z-index: 1;
  border-radius: 26px;
  border: 1px solid rgba(95, 106, 255, 0.28);
  background: rgba(7, 14, 30, 0.88);
  box-shadow: 0 28px 58px rgba(5, 15, 32, 0.4);
  padding: 2.1rem 2.2rem;
}
.dashboard-login {
  display: grid;
  gap: 1.4rem;
}
.dashboard-login__header {
  display: grid;
  gap: 0.5rem;
}
.dashboard-login__header p {
  font-size: 0.95rem;
  color: rgba(191, 219, 254, 0.78);
}
.dashboard-login__hint {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-content {
  margin-top: 3.2rem;
}
.dashboard-cards {
  display: grid;
  gap: 1.6rem;
}
.dashboard-card--wide {
  grid-column: span 1;
}
.dashboard-support {
  display: grid;
  gap: 1rem;
  color: rgba(244, 247, 255, 0.78);
}
.dashboard-support__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.dashboard-support__actions .button {
  font-size: 0.86rem;
  padding: 0.55rem 1.1rem;
}
@media (min-width: 880px) {
  .dashboard-hero__inner {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    align-items: stretch;
  }
}
@media (min-width: 960px) {
  .dashboard-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dashboard-card--wide,
  .dashboard-support {
    grid-column: span 2;
  }
}
@media (min-width: 720px) {
  .request-form .form-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 780px) {
  .dashboard-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 900px) {
  .dashboard-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.status-message {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
  min-height: 1.4rem;
}
.status-message[data-variant='success'] {
  color: #22c55e;
}
.status-message[data-variant='error'] {
  color: #f87171;
}
.status-message[data-variant='info'] {
  color: rgba(148, 163, 184, 0.9);
}
.success-summary {
  margin-top: 1.25rem;
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.08);
  color: rgba(226, 232, 240, 0.96);
  display: grid;
  gap: 0.75rem;
}
.success-summary ul {
  padding-left: 1.1rem;
  display: grid;
  gap: 0.4rem;
  list-style: disc;
}
.success-summary code {
  background: rgba(15, 23, 42, 0.85);
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
  font-size: 0.85rem;
}
.success-summary .success-note {
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.85);
  margin: 0;
}
.success-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}
.tier-summary {
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(94, 234, 212, 0.25);
  background: rgba(13, 148, 136, 0.08);
  color: rgba(209, 250, 229, 0.92);
  display: grid;
  gap: 0.6rem;
  font-size: 0.9rem;
}
.tier-summary ul {
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
  list-style: disc;
}
.tier-summary__status {
  font-weight: 600;
  color: rgba(167, 243, 208, 0.95);
  margin: 0;
}
.tier-summary__warning {
  margin: 0;
  font-weight: 600;
  color: rgba(248, 113, 113, 0.95);
}
.tier-list {
  display: grid;
  gap: 0.6rem;
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.9);
}
.dashboard-card {
  display: grid;
  gap: 1rem;
}
.dashboard-card[hidden] {
  display: none !important;
}
.dashboard-balance {
  display: grid;
  gap: 0.9rem;
}
.dashboard-balance__primary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.dashboard-balance__amount {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 600;
  color: #f8fafc;
}
.dashboard-balance__subtitle {
  font-size: 0.95rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-balance__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.dashboard-pill--inactive {
  opacity: 0.4;
  border-style: dashed;
}
.dashboard-balance__tiers {
  display: grid;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(191, 219, 254, 0.85);
}
.dashboard-balance__thresholds {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
}
.dashboard-balance__refreshed {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.75);
}
.dashboard-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.dashboard-card__head h2 {
  margin: 0;
}
.dashboard-form {
  display: grid;
  gap: 0.9rem;
}
.dashboard-form label {
  display: grid;
  gap: 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.92);
}
.dashboard-form input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  font-size: 0.95rem;
  font-family: inherit;
}
.dashboard-form input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
.dashboard-form small {
  font-size: 0.8rem;
  font-weight: 400;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.dashboard-summary {
  display: grid;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.9);
}
.dashboard-summary__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  align-items: center;
}
.dashboard-summary__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid rgba(59, 130, 246, 0.35);
  background: rgba(37, 99, 235, 0.18);
  color: #bfdbfe;
}
.dashboard-summary__detail {
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-stats {
  display: grid;
  gap: 1rem;
}
.dashboard-updated {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(148, 163, 184, 0.75);
}
.dashboard-updated[data-variant='info'] {
  color: rgba(148, 163, 184, 0.75);
}
.dashboard-updated[data-variant='success'] {
  color: rgba(34, 197, 94, 0.85);
}
.dashboard-updated[data-variant='error'] {
  color: rgba(248, 113, 113, 0.9);
}
.dashboard-stats__item {
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 14px;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.82);
  display: grid;
  gap: 0.4rem;
}
.dashboard-stats__label {
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.85);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.dashboard-stats__value {
  font-size: 1.4rem;
  font-weight: 600;
  color: #f8fafc;
}
.dashboard-stats__hint {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-trends {
  display: grid;
  gap: 0.85rem;
}
.dashboard-trend-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.8rem;
}
.dashboard-trend-item {
  display: grid;
  gap: 0.45rem;
}
.dashboard-trend-item__header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-trend-item__bar {
  display: flex;
  gap: 0.3rem;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 999px;
  overflow: hidden;
  height: 8px;
}
.dashboard-trend-item__bar-segment {
  display: block;
  height: 100%;
}
.dashboard-trend-item__bar-paid {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.75));
}
.dashboard-trend-item__bar-free {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.75));
}
.dashboard-trend-item__meta {
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-referrers {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
  font-size: 0.9rem;
  color: rgba(226, 232, 240, 0.9);
}
.dashboard-referrers__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(15, 23, 42, 0.82);
}
.dashboard-referrers__host {
  font-weight: 500;
  overflow-wrap: anywhere;
}
.dashboard-referrers__count {
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-webhooks {
  display: grid;
  gap: 1.1rem;
}
.dashboard-webhooks__summary {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}
.dashboard-webhooks__summary-item {
  border-radius: 16px;
  padding: 1rem 1.1rem;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(59, 130, 246, 0.18);
  box-shadow: 0 20px 40px rgba(6, 12, 28, 0.32);
  display: grid;
  gap: 0.4rem;
}
.dashboard-webhooks__summary-item--success {
  border-color: rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.14);
}
.dashboard-webhooks__summary-item--danger {
  border-color: rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.14);
}
.dashboard-webhooks__summary-label {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-webhooks__summary-value {
  font-size: 1.3rem;
  font-weight: 600;
  color: #f8fafc;
}
.dashboard-webhooks__summary-hint {
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-webhooks__heading {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(191, 219, 254, 0.9);
}
.dashboard-webhooks__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.8rem;
}
.dashboard-webhooks__item {
  border-radius: 14px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  background: rgba(15, 23, 42, 0.82);
  padding: 0.85rem 1rem;
  display: grid;
  gap: 0.65rem;
}
.dashboard-webhooks__item-head {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}
.dashboard-webhooks__item-time {
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.8);
}
.dashboard-webhooks__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 1rem;
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-webhooks__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.dashboard-webhooks__meta-item a {
  color: rgba(191, 219, 254, 0.95);
  text-decoration: underline;
}
.dashboard-webhooks__error {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(248, 113, 113, 0.9);
}
.dashboard-activity {
  display: grid;
  gap: 0.85rem;
}
.dashboard-activity__item {
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 14px;
  padding: 0.85rem 1rem;
  background: rgba(15, 23, 42, 0.82);
  display: grid;
  gap: 0.6rem;
}
.dashboard-activity__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
}
.dashboard-activity__value {
  font-weight: 600;
  color: #f8fafc;
}
.dashboard-activity__time {
  margin-left: auto;
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.8);
}
.dashboard-activity__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-activity__meta a {
  color: rgba(191, 219, 254, 0.95);
  text-decoration: underline;
}
.dashboard-activity__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.dashboard-links {
  display: grid;
  gap: 1rem;
}
.dashboard-link-card {
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 14px;
  padding: 1rem 1.2rem;
  background: rgba(15, 23, 42, 0.82);
  display: grid;
  gap: 0.75rem;
}
.dashboard-link-card header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}
.dashboard-link-card .link-url {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  color: rgba(191, 219, 254, 0.95);
  word-break: break-word;
}
.dashboard-link-card .link-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.dashboard-link-card .link-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.dashboard-link-card .link-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.dashboard-link-card .link-actions .button {
  font-size: 0.85rem;
  padding: 0.45rem 1rem;
}
.dashboard-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid rgba(94, 234, 212, 0.35);
  color: #5eead4;
  background: rgba(15, 118, 110, 0.18);
}
.dashboard-pill--baseline {
  border-color: rgba(129, 140, 248, 0.35);
  color: #c7d2fe;
  background: rgba(79, 70, 229, 0.2);
}
.dashboard-pill--growth {
  border-color: rgba(59, 130, 246, 0.35);
  color: #bfdbfe;
  background: rgba(37, 99, 235, 0.18);
}
.dashboard-pill--premium {
  border-color: rgba(249, 115, 22, 0.35);
  color: #fcd34d;
  background: rgba(234, 88, 12, 0.18);
}
.dashboard-pill--success {
  border-color: rgba(34, 197, 94, 0.4);
  color: rgba(190, 242, 190, 0.95);
  background: rgba(34, 197, 94, 0.18);
}
.dashboard-pill--danger {
  border-color: rgba(248, 113, 113, 0.4);
  color: rgba(254, 205, 211, 0.95);
  background: rgba(248, 113, 113, 0.18);
}
.dashboard-empty {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.85);
}
.result-card {
  margin-top: 1.1rem;
  padding: 1.25rem;
  border-radius: 14px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  background: rgba(15, 23, 42, 0.85);
  display: grid;
  gap: 0.75rem;
}
.result-body {
  display: grid;
  gap: 0.75rem;
}
.result-body pre {
  margin: 0;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.55rem;
  margin-left: 0.45rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.badge-success {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.32);
}
.badge-info {
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.28);
}
.scroll-highlight {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.45), 0 12px 30px rgba(37, 99, 235, 0.28);
  transition: box-shadow 0.25s ease;
}
@keyframes highlightPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.45), 0 10px 24px rgba(37, 99, 235, 0.24);
  }
  60% {
    box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.22), 0 18px 32px rgba(37, 99, 235, 0.3);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.1), 0 8px 22px rgba(37, 99, 235, 0.18);
  }
}
.site-footer {
  border-top: 1px solid rgba(244, 247, 255, 0.08);
  background: rgba(6, 10, 19, 0.94);
  margin-top: auto;
  padding: 3.2rem 1.75rem 2.4rem;
}
.footer-shell {
  max-width: 1160px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 2.5rem;
}
.footer-brand {
  display: grid;
  gap: 1rem;
  max-width: 420px;
}
.footer-logo {
  font-family: ${fonts.heading};
  font-weight: 600;
  letter-spacing: 0.12em;
  font-size: 1.05rem;
  text-transform: uppercase;
  color: var(--color-text-strong);
}
.footer-summary {
  font-size: 0.95rem;
  line-height: 1.65;
  color: rgba(244, 247, 255, 0.75);
}
.footer-social {
  display: inline-flex;
  gap: 0.75rem;
}
.footer-social a {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(244, 247, 255, 0.12);
  background: rgba(12, 22, 42, 0.7);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: all 160ms ease;
}
.footer-social a:hover,
.footer-social a:focus-visible {
  color: var(--color-text-strong);
  border-color: rgba(12, 229, 255, 0.4);
  box-shadow: 0 10px 24px rgba(12, 229, 255, 0.25);
  text-decoration: none;
}
.footer-columns {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.footer-column {
  display: grid;
  gap: 0.75rem;
}
.footer-heading {
  font-size: 0.82rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(244, 247, 255, 0.55);
}
.footer-link {
  font-size: 0.95rem;
  color: rgba(244, 247, 255, 0.78);
  text-decoration: none;
}
.footer-link:hover,
.footer-link:focus-visible {
  color: var(--color-text-strong);
  text-decoration: none;
}
.footer-meta {
  max-width: 1160px;
  margin: 2.5rem auto 0;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(244, 247, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.85);
}
.footer-meta a {
  color: rgba(244, 247, 255, 0.78);
  text-decoration: none;
}
.footer-meta a:hover,
.footer-meta a:focus-visible {
  color: var(--color-text-strong);
  text-decoration: none;
}
table {
  border-collapse: collapse;
  border: 1px solid rgba(148, 163, 184, 0.2);
}
th, td {
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: 0.65rem 0.9rem;
  text-align: left;
  font-size: 0.9rem;
}
.questions dt {
  font-weight: 600;
  margin-bottom: 0.2rem;
}
.questions dd {
  margin: 0 0 1rem 0;
  color: rgba(226, 232, 240, 0.88);
}
@media (max-width: 1023px) {
  .nav-shell {
    grid-template-columns: auto auto;
    padding: 1rem 1.35rem;
  }
  .nav-menu,
  .nav-actions {
    display: none;
  }
  .nav-toggle {
    display: inline-flex;
    justify-self: end;
  }
  .pricing-hero {
    padding-top: 4rem;
  }
  .pricing-hero__grid {
    grid-template-columns: 1fr;
    gap: 2.2rem;
  }
  .pricing-estimator__grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .pricing-estimator__controls,
  .pricing-estimator__summary {
    padding: 2rem;
  }
  .pricing-contact {
    padding: 2.2rem;
  }
  .docs-hero__grid {
    grid-template-columns: 1fr;
    gap: 2.2rem;
  }
  .docs-hero__snippet {
    padding: 1.8rem;
  }
  .docs-hero__snippet pre {
    font-size: 0.88rem;
  }
  .link-hero__grid {
    grid-template-columns: 1fr;
    gap: 2.2rem;
  }
  .link-builder__grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .link-builder-support {
    padding: 2.2rem;
  }
  .token-hero__grid {
    grid-template-columns: 1fr;
    gap: 2.4rem;
  }
  .token-dex-card__embed {
    min-height: 280px;
  }
  .token-economics__grid {
    grid-template-columns: 1fr;
  }
  .token-cta {
    padding: 2.4rem;
  }
}
@media (max-width: 767px) {

  .social-strip {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .steps-layout {
    grid-template-columns: 1fr;
  }
  .steps-visual {
    padding: 1.6rem;
  }
  .feature-grid,
  .analytics-grid,
  .testimonial-strip {
    grid-template-columns: 1fr;
  }
  .analytics-chart {
    height: 160px;
  }
  .testimonial-strip {
    gap: 1.2rem;
  }
  .pricing-hero__capsule {
    padding: 1.8rem;
  }
  .tier-toggle {
    grid-template-columns: 1fr;
  }
  .pricing-estimator__controls,
  .pricing-estimator__summary {
    padding: 1.6rem;
  }
  .pricing-estimator__summary footer strong {
    font-size: 2rem;
  }
  .pricing-tier-card {
    padding: 1.6rem;
  }
  .pricing-contact {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .pricing-contact__actions {
    width: 100%;
    gap: 0.75rem;
  }
  .pricing-contact__actions .button {
    flex: 1 1 auto;
  }
  .docs-hero__actions .button {
    width: 100%;
  }
  .docs-hero__snippet {
    padding: 1.4rem;
  }
  .docs-hero__snippet header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }
  .docs-hero__snippet pre {
    font-size: 0.85rem;
  }
  .docs-step-card {
    padding: 1.6rem;
  }
  .docs-resource-card {
    padding: 1.3rem;
  }
  .link-hero__links .button {
    width: 100%;
  }
  .link-hero__panel {
    padding: 1.8rem;
  }
  .link-builder__card {
    padding: 1.6rem;
  }
  .link-builder__info {
    padding: 1.4rem 1.5rem;
  }
  .link-builder__info pre {
    font-size: 0.8rem;
  }
  .link-builder-support {
    padding: 2rem;
    flex-direction: column;
    align-items: flex-start;
  }
  .link-builder-support__actions {
    width: 100%;
    gap: 0.75rem;
  }
  .link-builder-support__actions .button {
    flex: 1 1 auto;
  }
  .token-hero__actions .button {
    width: 100%;
  }
  .token-contract__value {
    flex-direction: column;
    align-items: stretch;
  }
  .token-stats {
    grid-template-columns: 1fr;
  }
  .token-dex-card {
    padding: 1.6rem;
  }
  .token-dex-card__embed iframe {
    height: 260px;
  }
  .token-utility-card {
    padding: 1.6rem;
  }
  .token-chart__ring {
    width: 200px;
    height: 200px;
  }
  .token-roadmap__timeline {
    grid-template-columns: 1fr;
  }
  .token-roadmap__timeline::before {
    display: none;
  }
  .roadmap-node::before {
    left: 18px;
  }
  .token-cta {
    padding: 2rem;
    flex-direction: column;
    align-items: flex-start;
  }
  .token-cta__actions {
    width: 100%;
    gap: 0.75rem;
  }
  .token-cta__actions .button {
    flex: 1 1 auto;
  }
  body {
    background: linear-gradient(170deg, #050505 0%, #0b1220 45%, #050505 100%);
  }
  .page {
    padding: 2.5rem 1.1rem 3rem;
    gap: 2.5rem;
  }
  .hero {
    gap: 1.1rem;
  }
  h1 {
    font-size: clamp(2rem, 9vw, 3rem);
  }
  h2 {
    font-size: 1.35rem;
  }
  .subhead {
    font-size: 1.05rem;
    line-height: 1.6;
  }
  .cta-row {
    flex-direction: column;
    align-items: stretch;
  }
  .button {
    width: 100%;
    font-size: 0.95rem;
  }
  .trust-bar {
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.8rem;
  }
  .card {
    padding: 1rem;
  }
  ul,
  ol {
    padding-left: 1.1rem;
    gap: 0.45rem;
  }
  pre {
    font-size: 0.78rem;
    padding: 1rem;
  }
  table {
    display: block;
    overflow-x: auto;
    font-size: 0.85rem;
  }
  th,
  td {
    white-space: nowrap;
  }
  .paywall-origin {
    font-size: 0.82rem;
    word-break: break-word;
  }
  .paywall-form textarea {
    font-size: 0.85rem;
    min-height: 100px;
  }
  .result-card {
    padding: 1rem;
  }
  .footer-shell {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .footer-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
  }
  .footer-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.6rem;
  }
}
@media (max-width: 479px) {
  .footer-columns {
    grid-template-columns: 1fr;
  }
  .nav-drawer__panel {
    width: min(360px, 92vw);
  }
}


`;

function renderHeader() {
  const navMenu = NAV_LINKS.map(
    (link) => html`<a
      class="nav-link"
      href="${link.href}"
      data-analytics-click="${link.analytics}"
    >
      ${link.label}
    </a>`
  );

  const drawerMenu = NAV_LINKS.map(
    (link) => html`<a
      class="nav-drawer__link"
      href="${link.href}"
      data-analytics-click="${link.analytics}"
      data-nav-close
    >
      ${link.label}
    </a>`
  );

  const desktopSocial = SOCIAL_LINKS.map(
    (link) => html`<a
      href="${link.href}"
      aria-label="${link.label}"
      target="_blank"
      rel="noopener noreferrer"
      data-analytics-click="${link.analytics}"
    >
      ${link.tag}
    </a>`
  );

  const drawerSocial = SOCIAL_LINKS.map(
    (link) => html`<a
      href="${link.href}"
      aria-label="${link.label}"
      target="_blank"
      rel="noopener noreferrer"
      data-analytics-click="${link.analytics}"
      data-nav-close
    >
      ${link.tag}
    </a>`
  );

  return html`<header class="site-header">
    <nav class="nav-shell">
      <a class="nav-brand" href="/" data-analytics-click="nav_home">
        <span class="nav-brand__logo">Sol402</span>
      </a>
      <div class="nav-menu">${navMenu}</div>
      <div class="nav-actions">
        <div class="nav-social nav-social--desktop">${desktopSocial}</div>
        <a class="nav-dashboard" href="/dashboard" data-analytics-click="view_dashboard_nav">
          Dashboard
        </a>
        <a
          class="button primary nav-cta"
          href="/link/request"
          data-analytics-click="click_launch_builder_nav"
          data-analytics-props='{"source":"nav"}'
        >
          Launch builder
        </a>
      </div>
      <button
        class="nav-toggle"
        type="button"
        data-nav-toggle
        aria-expanded="false"
        aria-controls="mobile-navigation"
        aria-label="Toggle navigation"
      >
        <span class="sr-only">Toggle navigation</span>
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
        <span class="nav-toggle__bar"></span>
      </button>
    </nav>
    <div class="nav-drawer" data-nav-drawer aria-hidden="true">
      <div class="nav-drawer__backdrop" data-nav-close></div>
      <div
        class="nav-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Sol402 navigation"
        id="mobile-navigation"
      >
        <div class="nav-drawer__header">
          <span class="nav-brand__logo">Sol402</span>
          <button class="nav-close" type="button" data-nav-close aria-label="Close navigation">
            ×
          </button>
        </div>
        <div class="nav-drawer__menu">${drawerMenu}</div>
        <div class="nav-drawer__actions">
          <a
            class="nav-dashboard"
            href="/dashboard"
            data-analytics-click="view_dashboard_nav_mobile"
            data-nav-close
          >
            Dashboard
          </a>
          <a
            class="button primary"
            href="/link/request"
            data-analytics-click="click_launch_builder_nav_mobile"
            data-analytics-props='{"source":"nav-drawer"}'
            data-nav-close
          >
            Launch builder
          </a>
        </div>
        <div class="nav-social nav-drawer__social">${drawerSocial}</div>
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  const footerSocial = SOCIAL_LINKS.map(
    (link) => html`<a
      href="${link.href}"
      aria-label="${link.label}"
      target="_blank"
      rel="noopener noreferrer"
      data-analytics-click="${link.analytics.replace('nav_', 'footer_')}"
    >
      ${link.tag}
    </a>`
  );

  return html`<footer class="site-footer">
    <div class="footer-shell">
      <div class="footer-brand">
        <span class="footer-logo">Sol402</span>
        <p class="footer-summary">
          Non-custodial pay-per-request rails for the x402 economy. Spin up a paywall in minutes and
          settle directly to your Solana wallet.
        </p>
        <div class="footer-social">${footerSocial}</div>
      </div>
      <div class="footer-columns">
        <div class="footer-column">
          <span class="footer-heading">Product</span>
          <a class="footer-link" href="/">Home</a>
          <a class="footer-link" href="/pricing">Pricing</a>
          <a class="footer-link" href="/token">Token</a>
          <a class="footer-link" href="/dashboard">Dashboard</a>
        </div>
        <div class="footer-column">
          <span class="footer-heading">Builders</span>
          <a class="footer-link" href="/link/request">Link builder</a>
          <a class="footer-link" href="/docs/quickstart">Docs</a>
          <a class="footer-link" href="/demo">Demo</a>
          <a class="footer-link" href="/link/request">Request assist</a>
        </div>
        <div class="footer-column">
          <span class="footer-heading">Connect</span>
          <a class="footer-link" href="mailto:admin@sol402.app">Email us</a>
          <a
            class="footer-link"
            href="https://dexscreener.com/solana/hsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump"
            target="_blank"
            rel="noopener noreferrer"
          >
            Dexscreener
          </a>
          <a
            class="footer-link"
            href="https://github.com/sol402proxy-ai/sol402"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            class="footer-link"
            href="https://x.com/sol402proxy"
            target="_blank"
            rel="noopener noreferrer"
          >
            X (Twitter)
          </a>
        </div>
      </div>
    </div>
    <div class="footer-meta">
      <span>© ${year} Sol402. All rights reserved.</span>
      <a href="mailto:admin@sol402.app">admin@sol402.app</a>
    </div>
  </footer>`;
}

const CANONICAL_BASE = 'https://sol402.app';

const analyticsBootstrap = (event: string) => html`<script>
  (function () {
    const endpoint = '/analytics/events';
    const consoleEnabled = true;

    const deliver = (envelope) => {
      const serialized = JSON.stringify(envelope);
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([serialized], { type: 'application/json' });
          if (navigator.sendBeacon(endpoint, blob)) {
            return;
          }
        }
        fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: serialized,
          keepalive: true,
        }).catch(() => {
          /* noop */
        });
      } catch (error) {
        console.warn('analytics transport error', error);
      }
    };

    const track = (name, props) => {
      const payload = {
        name,
        path: window.location.pathname,
        props: props || {},
        ts: Date.now(),
        referrer: document.referrer || undefined,
      };
      if (window.sol402Analytics) {
        try {
          window.sol402Analytics(name, payload);
        } catch (error) {
          console.warn('sol402Analytics error', error);
        }
      }
      if (consoleEnabled) {
        console.info('[analytics]', name, payload);
      }
      deliver(payload);
    };

    window.sol402Track = track;

    const scrollToTarget = (id) => {
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      const header = document.querySelector('header');
      const headerOffset = header ? header.offsetHeight + 12 : 0;
      const top = Math.max(target.getBoundingClientRect().top + window.scrollY - headerOffset, 0);
      window.scrollTo({ top, behavior: 'smooth' });
      target.classList.add('scroll-highlight');
      target.style.animation = 'highlightPulse 1.5s ease';
      setTimeout(() => {
        target.classList.remove('scroll-highlight');
        target.style.removeProperty('animation');
      }, 1600);
      if (target.focus) {
        target.focus({ preventScroll: true });
      }
    };

    document.addEventListener('DOMContentLoaded', () => {
      track('${event}', { source: 'page-load' });
      const hash = window.location.hash ? window.location.hash.slice(1) : '';
      if (hash) {
        setTimeout(() => scrollToTarget(hash), 60);
      }
      document.querySelectorAll('[data-analytics-click]').forEach((el) => {
        el.addEventListener('click', () => {
          const name = el.getAttribute('data-analytics-click');
          if (!name) return;
          const propsAttr = el.getAttribute('data-analytics-props');
          let props = {};
          if (propsAttr) {
            try {
              props = JSON.parse(propsAttr);
            } catch (err) {
              console.warn('invalid analytics props', err);
            }
          }
          track(name, { ...props, label: el.textContent?.trim() || undefined });
        });
      });
      const navToggle = document.querySelector('[data-nav-toggle]');
      const navDrawer = document.querySelector('[data-nav-drawer]');
      const setNavOpen = (open) => {
        const expanded = !!open;
        document.body.classList.toggle('nav-open', expanded);
        if (navToggle) {
          navToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
        if (navDrawer) {
          navDrawer.setAttribute('aria-hidden', expanded ? 'false' : 'true');
        }
      };
      const closeNav = () => setNavOpen(false);
      if (navToggle) {
        navToggle.addEventListener('click', () => {
          const isOpen = document.body.classList.contains('nav-open');
          setNavOpen(!isOpen);
        });
      }
      document.querySelectorAll('[data-nav-close]').forEach((el) => {
        el.addEventListener('click', () => closeNav());
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeNav();
        }
      });
      window.addEventListener('resize', () => {
        if (window.innerWidth > 1023) {
          closeNav();
        }
      });
      document.querySelectorAll('[data-scroll-target]').forEach((el) => {
        el.addEventListener('click', (event) => {
          const targetId = el.getAttribute('data-scroll-target');
          if (!targetId) {
            return;
          }
          if (event) {
            event.preventDefault();
          }
          scrollToTarget(targetId);
          if (history.replaceState) {
            history.replaceState(null, '', '#' + targetId);
          }
        });
      });
      const copyText = async (text) => {
        if (navigator.clipboard && window.isSecureContext) {
          return navigator.clipboard.writeText(text);
        }
        return new Promise((resolve, reject) => {
          try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.top = '-1000px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const succeeded = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (succeeded) {
              resolve();
            } else {
              reject(new Error('execCommand failed'));
            }
          } catch (error) {
            reject(error);
          }
        });
      };
      document.querySelectorAll('[data-copy]').forEach((el) => {
        el.addEventListener('click', async (event) => {
          const text = el.getAttribute('data-copy');
          if (!text) {
            return;
          }
          if (event) {
            event.preventDefault();
          }
          const original = el.getAttribute('data-copy-label') || el.textContent || '';
          const successLabel = el.getAttribute('data-copy-success') || 'Copied!';
          try {
            await copyText(text);
            el.classList.add('copied');
            el.textContent = successLabel;
            setTimeout(() => {
              el.classList.remove('copied');
              el.textContent = original;
            }, 1800);
          } catch (error) {
            console.warn('Copy failed', error);
            el.classList.add('copied');
            el.textContent = 'Copy failed';
            setTimeout(() => {
              el.classList.remove('copied');
              el.textContent = original;
            }, 2000);
          }
        });
      });
    });
  })();
</script>`;

export function renderPage(options: PageOptions) {
  const {
    title,
    description,
    ogTitle,
    ogDescription,
    path,
    analyticsEvent,
    bodyClass,
    content,
  } = options;

  const canonicalUrl = `${CANONICAL_BASE}${path}`;

  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>${title}</title>
        <meta name="description" content="${description}" />
        <meta property="og:title" content="${ogTitle ?? title}" />
        <meta property="og:description" content="${ogDescription ?? description}" />
        <meta property="og:image" content="/og.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="${colors.background}" />
        <link rel="canonical" href="${canonicalUrl}" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon-64.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/assets/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png" />
        <style>${raw(globalStyles)}</style>
      </head>
      <body class="${bodyClass ?? ''}">
        ${renderHeader()}
        <main>
          <div class="page">${content}</div>
        </main>
        ${renderFooter()}
        ${analyticsBootstrap(analyticsEvent)}
      </body>
    </html>`;
}
