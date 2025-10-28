import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';

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

const globalStyles = `
:root {
  color-scheme: dark;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #050505;
  color: #f5f5f5;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: linear-gradient(145deg, #050505 0%, #111827 35%, #050505 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
a {
  color: inherit;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  background: rgba(5, 5, 5, 0.92);
  position: sticky;
  top: 0;
  z-index: 10;
}
.nav {
  margin: 0 auto;
  max-width: 1080px;
  padding: 1.2rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.logo {
  font-weight: 700;
  letter-spacing: 0.04em;
  font-size: 1.125rem;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.nav-links a {
  font-size: 0.95rem;
  color: rgba(245, 245, 245, 0.88);
}
.nav-links a.demo {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.nav-links a.primary {
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  background: #2563eb;
  color: #f8fafc;
  font-weight: 600;
  border: 1px solid rgba(37, 99, 235, 0.6);
}
.nav-links a.primary:hover {
  background: #1d4ed8;
}
main {
  flex: 1;
}
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 3.5rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
}
.hero {
  display: grid;
  gap: 1.5rem;
}
.eyebrow {
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.24em;
  color: rgba(148, 163, 184, 0.8);
}
h1 {
  font-size: clamp(2.4rem, 4vw, 3.5rem);
  margin: 0;
  line-height: 1.1;
}
h2 {
  font-size: 1.6rem;
  margin: 0;
}
p {
  margin: 0;
  line-height: 1.7;
  color: rgba(226, 232, 240, 0.92);
}
.subhead {
  font-size: 1.15rem;
  color: rgba(226, 232, 240, 0.86);
}
.cta-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.65rem 1.35rem;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid rgba(148, 163, 184, 0.26);
  color: #f8fafc;
  transition: all 0.15s ease;
}
button.button {
  cursor: pointer;
  font-family: inherit;
}
.button.primary {
  background: #3b82f6;
  border-color: rgba(59, 130, 246, 0.5);
}
.button.primary:hover {
  background: #2563eb;
}
.button.secondary {
  background: rgba(15, 23, 42, 0.65);
}
.button.copied {
  background: #1d4ed8;
  border-color: rgba(59, 130, 246, 0.6);
  color: #f8fafc;
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
  gap: 1rem;
}
ul, ol {
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
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  border: 1px solid rgba(59, 130, 246, 0.18);
}
code {
  font-family: inherit;
  color: #93c5fd;
}
.grid-2 {
  display: grid;
  gap: 1.5rem;
}
.demo-grid {
  grid-template-columns: minmax(0, 1fr);
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
  font-family: 'Inter', 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
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
footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(5, 5, 5, 0.92);
}
.footer-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  font-size: 0.85rem;
  color: rgba(148, 163, 184, 0.9);
}
.link-list {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.disclaimer {
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.75);
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
@media (max-width: 720px) {
  body {
    background: linear-gradient(170deg, #050505 0%, #0b1220 45%, #050505 100%);
  }
  .nav {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.2rem;
  }
  .nav-links {
    width: 100%;
    gap: 0.5rem 0.75rem;
    justify-content: flex-start;
  }
  .nav-links a {
    font-size: 0.9rem;
    padding: 0.35rem 0.5rem;
  }
  .nav-links a.primary {
    width: 100%;
    text-align: center;
    margin-top: 0.25rem;
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
  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .link-list {
    width: 100%;
    justify-content: flex-start;
    gap: 0.6rem;
  }
}
`;

function renderHeader() {
  return html`<header>
    <nav class="nav">
      <a class="logo" href="/">Sol402</a>
      <div class="nav-links">
        <a href="/docs/quickstart" data-analytics-click="view_docs">Docs</a>
        <a href="/pricing" data-analytics-click="view_pricing">Pricing</a>
        <a href="/api" data-analytics-click="view_api">API</a>
        <a href="/link" data-analytics-click="view_link">Link</a>
        <a href="/link/request" data-analytics-click="view_link_request_nav">Request</a>
        <a href="/dashboard" data-analytics-click="view_dashboard_nav">Dashboard</a>
        <a href="/token" data-analytics-click="view_token">Token</a>
        <a class="demo" href="/demo" data-analytics-click="view_demo_nav">Demo</a>
        <a
          href="https://github.com/sol402proxy-ai/sol402"
          target="_blank"
          rel="noopener noreferrer"
          data-analytics-click="view_github"
        >
          GitHub
        </a>
        <a
          class="primary"
          href="/link/request"
          data-analytics-click="click_request_link_nav"
          data-analytics-props='{"source":"nav"}'
        >
          Request a link
        </a>
      </div>
    </nav>
  </header>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return html`<footer>
    <div class="footer-inner">
      <span>© ${year} Sol402.</span>
      <div class="link-list">
        <a href="/legal/terms">Terms</a>
        <a href="/legal/privacy">Privacy</a>
        <a href="/link/request">Request</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/demo">Demo</a>
        <a href="mailto:admin@sol402.app">Contact: admin@sol402.app</a>
        <a
          href="https://github.com/sol402proxy-ai/sol402"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
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
        <meta name="theme-color" content="#0A0A0A" />
        <link rel="canonical" href="${canonicalUrl}" />
        <style>
          ${globalStyles}
        </style>
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
