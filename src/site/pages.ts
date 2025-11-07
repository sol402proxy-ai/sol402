import { html } from 'hono/html';
import { renderPage } from './layout.js';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type RenderFn = () => ReturnType<typeof renderPage>;

const CREATE_LINK_CURL = `curl -X POST https://sol402.app/admin/links \\
  -H "X-Admin-Key: $ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"origin":"https://example.com/my.pdf","priceUsd":0.01}'`;

const DOCS_SNIPPET = `# 1) Mint a paywalled link
curl -s https://sol402.app/admin/links \\
  -H "X-Admin-Key: $ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
        "origin": "https://arxiv.org/pdf/2510.21699",
        "priceUsd": 0.005,
        "merchant": "Dkin4KKuoCSbMjudt8RpE1YuZ7gqs8aAYVS1fWPiat2W"
      }'

# 2) First request → HTTP 402 challenge
curl -i https://sol402.app/p/<linkId>

# 3) After paying via PayAI
curl -i https://sol402.app/p/<linkId> \\
  -H "X-PAYMENT: <receipt-from-payai>"`;

type BrandBadgeVariant = 'hero' | 'section' | 'card' | 'document';

const brandBadgeSizes: Record<BrandBadgeVariant, number> = {
  hero: 120,
  section: 96,
  card: 72,
  document: 64,
};

const brandBadge = (
  variant: BrandBadgeVariant = 'hero',
  { decorative = false }: { decorative?: boolean } = {}
) => {
  const size = brandBadgeSizes[variant] ?? brandBadgeSizes.hero;
  return html`<figure
    class="brand-badge brand-badge--${variant}"
    ${decorative ? html`aria-hidden="true"` : ''}
  >
    <img
      src="/assets/sol402-logo.png"
      width="${size}"
      height="${size}"
      loading="lazy"
      decoding="async"
      alt="${decorative ? '' : 'Sol402 logomark'}"
    />
  </figure>`;
};

const docsHero = html`<section class="docs-hero">
  <div class="docs-hero__grid">
    <div class="docs-hero__copy" data-animate="fade-up">
      ${brandBadge('hero', { decorative: true })}
      <span class="eyebrow">Quickstart</span>
      <h1>Run the Sol402 paywall in five minutes</h1>
      <p class="subhead">
        Provision a paywalled link, return an HTTP 402 challenge, and let PayAI handle settlement. These
        steps mirror what ships in the repository today.
      </p>
      <div class="docs-hero__actions cta-row">
        <a class="button primary" href="/link/request" data-analytics-click="docs_launch_builder">
          Launch the builder
        </a>
        <a
          class="button secondary"
          href="https://github.com/sol402proxy-ai/sol402"
          target="_blank"
          rel="noreferrer"
          data-analytics-click="docs_view_repo"
        >
          Read API reference
        </a>
        <a class="button tertiary" href="/dashboard" data-analytics-click="docs_view_dashboard">
          Inspect dashboard
        </a>
      </div>
      <ul class="docs-hero__highlights">
        <li>Runtime: Cloudflare Workers · Hono</li>
        <li>Payments: PayAI facilitator · Solana USDC</li>
        <li>Analytics: ClickHouse + Grafana exporters</li>
      </ul>
    </div>
    <aside class="docs-hero__snippet" data-animate="scale-in" data-animate-delay="140">
      <header>
        <span>Minimal curl flow</span>
        <button
          type="button"
          class="button tertiary"
          data-copy="${escapeHtml(DOCS_SNIPPET)}"
          data-copy-label="Copy snippet"
          data-copy-success="Copied!"
          data-analytics-click="docs_copy_snippet"
        >
          Copy snippet
        </button>
      </header>
      <pre><code>${DOCS_SNIPPET}</code></pre>
    </aside>
  </div>
</section>`;

const docsSteps = html`<section class="section docs-steps" id="docs-steps">
  <div class="section__header">
    <h2>Four steps to production</h2>
    <p class="section__subhead">
      This mirrors the automation path built into sol402.app. Follow the steps manually, or connect your
      wallet and let the builder mint everything for you.
    </p>
  </div>
  <div class="docs-steps__grid">
    <article class="docs-step-card">
      <span class="docs-step-card__index">01</span>
      <h3>Provision</h3>
      <p>
        POST to <code>/admin/links</code> with your origin URL, price in USD, and merchant wallet. The
        response includes the public link ID and a scoped admin key.
      </p>
      <ul>
        <li>Supports JSON, file URLs, HTML, API endpoints</li>
        <li>Scoped admin key is tied to your merchant wallet</li>
      </ul>
    </article>
    <article class="docs-step-card">
      <span class="docs-step-card__index">02</span>
      <h3>Integrate</h3>
      <p>
        Serve the 402 challenge from <code>/p/:id</code>. Your client (browser, agent, script) redirects
        to PayAI, collects the payment, and retries with <code>X-PAYMENT</code>.
      </p>
      <ul>
        <li>Headers include <code>X-PAYMENT-REQUIREMENTS</code> for invoice details</li>
        <li>Works with PayAI facilitator UI or programmatic clients</li>
      </ul>
    </article>
    <article class="docs-step-card">
      <span class="docs-step-card__index">03</span>
      <h3>Observe</h3>
      <p>
        Every successful request emits analytics events to ClickHouse. The dashboard shows revenue,
        conversion, referrers, and recent payments within ~60 seconds.
      </p>
      <ul>
        <li>Events: <code>link_paid_call</code>, <code>link_free_call</code></li>
        <li>KV → ClickHouse export runs via Worker cron</li>
      </ul>
    </article>
    <article class="docs-step-card">
      <span class="docs-step-card__index">04</span>
      <h3>Scale</h3>
      <p>
        Use the admin API to rotate keys, adjust pricing, or update link metadata. Premium tiers unlock
        webhook dispatch and direct ClickHouse sync.
      </p>
      <ul>
        <li>PATCH endpoints to edit price and quotas</li>
        <li>Roadmap: automated webhooks + revenue exports</li>
      </ul>
    </article>
  </div>
</section>`;

const docsResources = html`<section class="section docs-resources">
  <div class="section__header">
    <h2>Resources &amp; reference</h2>
    <p class="section__subhead">
      Dive deeper into architecture, scripts, and troubleshooting. These links map to the canonical docs
      in this repository.
    </p>
  </div>
  <div class="docs-resources__grid">
    <a
      class="docs-resource-card"
      href="https://github.com/sol402proxy-ai/sol402/blob/main/README.md"
      target="_blank"
      rel="noreferrer"
    >
      <header>
        <span>Architecture overview</span>
        <small>README</small>
      </header>
      <p>Understand the Worker, paywall middleware, analytics pipeline, and deployment targets.</p>
    </a>
    <a
      class="docs-resource-card"
      href="https://github.com/sol402proxy-ai/sol402/blob/main/SELF_SERVE_LINK_FLOW.md"
      target="_blank"
      rel="noreferrer"
    >
      <header>
        <span>Self-serve link flow</span>
        <small>Guide</small>
      </header>
      <p>See how wallet balances, tiers, and admin keys provisioned through the builder connect.</p>
    </a>
    <a
      class="docs-resource-card"
      href="https://github.com/sol402proxy-ai/sol402/blob/main/ANALYTICS_DASHBOARD_PLAN.md"
      target="_blank"
      rel="noreferrer"
    >
      <header>
        <span>Analytics dashboard</span>
        <small>Spec</small>
      </header>
      <p>Metrics schema, ClickHouse queries, and dashboard widgets powering the <code>/dashboard</code> route.</p>
    </a>
    <a class="docs-resource-card" href="mailto:admin@sol402.app">
      <header>
        <span>Support</span>
        <small>Email</small>
      </header>
      <p>Contact us for high-volume pricing, premium tier unlocks, or partnership requests.</p>
    </a>
  </div>
</section>`;

const docsFaq = html`<section class="section docs-faq">
  <div class="section__header">
    <h2>Integration FAQ</h2>
    <p class="section__subhead">Answers to the questions teams ask before shipping the paywall.</p>
  </div>
  <div class="docs-faq__accordion">
    <details class="docs-faq__item" open>
      <summary>
        <span>How do I test without spending real USDC?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        Point <code>SOLANA_RPC_URL</code> at devnet and use <code>FREE_CALLS_PER_WALLET_PER_DAY</code> to
        simulate quota. You can also set <code>SETTLE_WITH_PAYAI=false</code> for full local flows.
      </p>
    </details>
    <details class="docs-faq__item">
      <summary>
        <span>Can I bring my own facilitator or paywall UI?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        Yes. The 402 response includes a standard <code>paymentRequirements</code> payload. You can
        implement your own client as long as it posts a valid receipt in <code>X-PAYMENT</code>.
      </p>
    </details>
    <details class="docs-faq__item">
      <summary>
        <span>What happens if the RPC provider flakes?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        The token service retries with exponential backoff and emits metrics to Grafana via the
        <code>RPC_METRICS_URL</code> endpoint. Premium tiers also get priority RPC pools.
      </p>
    </details>
    <details class="docs-faq__item">
      <summary>
        <span>How do merchants rotate admin keys?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        Call <code>POST /admin/keys/rotate</code> with your current key. The dashboard will surface a
        downloadable copy and invalidate the previous secret instantly.
      </p>
    </details>
  </div>
</section>`;

const linkHero = html`<section class="link-hero">
  <div class="link-hero__grid">
    <div class="link-hero__copy" data-animate="fade-up">
      ${brandBadge('hero', { decorative: true })}
      <span class="eyebrow">Self-serve builder</span>
      <h1>Launch a Sol402 paywall from your wallet</h1>
      <p class="subhead">
        Hold enough SOL402, connect Phantom, and mint a pay-per-request link that settles directly to your
        merchant wallet. No emails, no manual review.
      </p>
      <div class="cta-row">
        <button class="button primary" type="button" data-scroll-target="builder">
          Start the builder
        </button>
        <a class="button secondary" href="/docs/quickstart" data-analytics-click="link_docs">
          Read implementation guide
        </a>
      </div>
      <ul class="link-hero__highlights">
        <li>Wallet custody stays with you — we never hold funds.</li>
        <li>Scoped admin key + dashboard minted in a single response.</li>
        <li>Tier perks apply instantly based on your on-chain balance.</li>
      </ul>
    </div>
    <aside class="link-hero__panel" data-animate="scale-in" data-animate-delay="160">
      <header>
        <span class="link-hero__label">Tier fast facts</span>
        <p>Eligibility updates the moment your wallet crosses the threshold.</p>
      </header>
      <ul class="link-hero__stats">
        <li>
          <strong>Baseline · ≥1M SOL402</strong>
          <span>Instant onboarding · 3 links · 200 paid calls/day · 5 free calls/day</span>
        </li>
        <li>
          <strong>Growth · ≥2M SOL402</strong>
          <span>25% discount · 10 links · 500 paid calls/day · priority retries</span>
        </li>
        <li>
          <strong>Premium · ≥5M SOL402</strong>
          <span>20 links · 2,000 paid calls/day · webhooks + ClickHouse sync</span>
        </li>
      </ul>
      <footer>
        <span>Need SOL402?</span>
        <div class="link-hero__links">
          <a
            class="button tertiary"
            href="https://pump.fun/coin/HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump"
            target="_blank"
            rel="noreferrer"
          >
            Buy on Pump.fun
          </a>
          <a
            class="button tertiary"
            href="https://dexscreener.com/solana/hsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump"
            target="_blank"
            rel="noreferrer"
          >
            View on Dexscreener
          </a>
        </div>
      </footer>
    </aside>
  </div>
</section>`;

const linkBuilderSection = html`<section class="link-builder" id="builder">
  <div class="link-builder__grid">
    <div class="link-builder__main">
      <article class="link-builder__card builder-card">
        <header class="link-builder__header">
          <span class="link-builder__step">Step 1</span>
          <h2>Connect your wallet</h2>
        </header>
        <p>
          Phantom is the fastest path today. We verify your SOL402 balance, assign the right tier, and
          scope credentials to this wallet.
        </p>
        <div id="builder-connect-status" class="builder-status" data-variant="info">
          Phantom not connected.
        </div>
        <div class="builder-actions">
          <button
            id="builder-connect"
            type="button"
            class="button primary"
            data-analytics-click="builder_connect_wallet"
          >
            Connect Phantom
          </button>
          <a
            class="button secondary"
            href="https://phantom.app/download"
            target="_blank"
            rel="noopener"
            data-analytics-click="builder_install_phantom"
          >
            Install Phantom
          </a>
        </div>
        <p class="builder-note">
          We never take custody of funds—SOL402 only reads your balance so the builder can unlock.
        </p>
      </article>
      <article class="link-builder__card builder-card link-builder__config" id="builder-config" hidden>
        <header class="link-builder__header">
          <span class="link-builder__step">Step 2</span>
          <h2>Configure your paywall</h2>
        </header>
        <div id="builder-tier-summary" class="tier-summary" aria-live="polite">
          Connect a wallet to view tier quotas and perks.
        </div>
        <form id="link-request-form" class="request-form" novalidate>
          <input type="hidden" name="merchantAddress" id="link-request-merchant" />
          <label>
            <span>Origin URL *</span>
            <input
              name="origin"
              type="url"
              required
              placeholder="https://example.com/report.pdf"
              inputmode="url"
            />
            <small>Public HTTPS resources only. We block private networks by default.</small>
          </label>
          <div class="form-row">
            <label>
              <span>Price per request (USDC)</span>
              <input
                name="priceUsd"
                type="number"
                min="0.001"
                step="0.001"
                inputmode="decimal"
                placeholder="0.005"
              />
              <small>Leave blank to use the default $0.005 meter.</small>
            </label>
            <label>
              <span>Contact email (optional)</span>
              <input
                name="contactEmail"
                type="email"
                placeholder="you@example.com"
                inputmode="email"
              />
              <small>We’ll send tier upgrades, quota alerts, and premium invites here.</small>
            </label>
          </div>
          <label>
            <span>Notes (optional)</span>
            <textarea
              name="notes"
              placeholder="Add context for the link, expected traffic, or anything else we should know."
            ></textarea>
          </label>
          <div class="form-section">
            <h3>Webhook delivery (optional)</h3>
            <p>
              Receive a signed POST every time your paywalled link settles. Leave these blank if you don’t
              need callbacks yet—you can always enable them later.
            </p>
          </div>
          <div class="form-row">
            <label>
              <span>Webhook URL</span>
              <input
                name="webhookUrl"
                type="url"
                placeholder="https://example.com/webhooks/sol402"
                inputmode="url"
              />
              <small>HTTPS only. We POST your settlement payload to this endpoint.</small>
            </label>
            <label>
              <span>Webhook secret</span>
              <input
                name="webhookSecret"
                type="text"
                minlength="8"
                maxlength="256"
                autocomplete="off"
                placeholder="Auto-generate if blank"
              />
              <small>Leave blank to auto-generate a 32-character secret (shown once after minting).</small>
            </label>
          </div>
          <div class="form-actions">
            <button type="submit" class="button primary" data-analytics-click="submit_link_request">
              Mint paywalled link
            </button>
            <span class="request-form-note">
              Your API key appears once. Store it in your secret manager immediately.
            </span>
          </div>
          <p id="link-request-status" class="status-message" data-variant="info"></p>
          <div id="link-request-success" class="success-summary" hidden></div>
        </form>
      </article>
    </div>
    <aside class="link-builder__aside">
      <article class="link-builder__info">
        <h3>What you’ll need</h3>
        <ul>
          <li>≥1M SOL402 in the wallet you connect.</li>
          <li>Destination URL (PDF, JSON, HTML, or API endpoint).</li>
          <li>Merchant wallet to receive USDC (defaults to the connected wallet).</li>
        </ul>
      </article>
      <article class="link-builder__info">
        <h3>Prefer the CLI?</h3>
        <p>
          Run the classic curl flow—the builder just saves a few steps. The dashboard and discounts work
          the same way.
        </p>
        <pre><code>${escapeHtml(CREATE_LINK_CURL)}</code></pre>
        <button
          class="button tertiary"
          type="button"
          data-copy="${escapeHtml(CREATE_LINK_CURL)}"
          data-copy-label="Copy curl snippet"
          data-copy-success="Copied!"
          data-analytics-click="builder_copy_manual_curl"
        >
          Copy curl snippet
        </button>
      </article>
      <article class="link-builder__info link-builder__info--support">
        <h3>Need help?</h3>
        <p>
          Enterprise volume, custom pricing, or agent partnerships? Email
          <a href="mailto:admin@sol402.app">admin@sol402.app</a> and we’ll set you up.
        </p>
      </article>
    </aside>
  </div>
  <script type="module">
    const connectButton = document.getElementById('builder-connect');
    const connectStatus = document.getElementById('builder-connect-status');
    const configSection = document.getElementById('builder-config');
    const tierSummary = document.getElementById('builder-tier-summary');
    const form = document.getElementById('link-request-form');
    const statusEl = document.getElementById('link-request-status');
    const successEl = document.getElementById('link-request-success');
    const merchantInput = document.getElementById('link-request-merchant');
    const submitButton = form?.querySelector('button[type=\"submit\"]');
    let connectedWallet = null;
    let currentTier = null;
    let lastThresholds = null;

    const escapeHtml = (value) => {
      const span = document.createElement('span');
      span.textContent = String(value ?? '');
      return span.innerHTML;
    };

    const formatTokens = (value) => {
      if (value == null) {
        return '';
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric.toLocaleString('en-US');
      }
      return String(value);
    };

    const writeClipboard = async (text) => {
      if (!text) {
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      await new Promise((resolve, reject) => {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.top = '-1000px';
          textarea.style.left = '-1000px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (ok) {
            resolve();
          } else {
            reject(new Error('Copy command failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    };

    const bindCopyButtons = (root) => {
      if (!root) {
        return;
      }
      const buttons = root.querySelectorAll('[data-copy]');
      buttons.forEach((button) => {
        if (!(button instanceof HTMLElement)) {
          return;
        }
        if (button.dataset.copyBound === 'true') {
          return;
        }
        button.dataset.copyBound = 'true';
        button.addEventListener('click', async (event) => {
          event?.preventDefault?.();
          const payload = button.getAttribute('data-copy');
          if (!payload) {
            return;
          }
          const original = button.getAttribute('data-copy-label') || button.textContent || 'Copy';
          const successLabel = button.getAttribute('data-copy-success') || 'Copied!';
          try {
            await writeClipboard(payload);
            button.classList.add('copied');
            button.textContent = successLabel;
            setTimeout(() => {
              button.classList.remove('copied');
              button.textContent = original;
            }, 2000);
          } catch (copyError) {
            console.warn('clipboard write failed', copyError);
            button.classList.add('copied');
            button.textContent = 'Copy failed';
            setTimeout(() => {
              button.classList.remove('copied');
              button.textContent = original;
            }, 2200);
          }
        });
      });
    };

    const getStringValue = (formData, name) => {
      const value = formData.get(name);
      if (typeof value !== 'string') {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const clearSuccess = () => {
      if (successEl) {
        successEl.innerHTML = '';
        successEl.setAttribute('hidden', 'true');
      }
    };

    const setStatus = (message, variant = 'info') => {
      if (!statusEl) {
        return;
      }
      if (!message) {
        statusEl.textContent = '';
        statusEl.dataset.variant = 'info';
        return;
      }
      statusEl.textContent = message;
      statusEl.dataset.variant = variant;
    };

    const setConnectStatus = (message, variant = 'info') => {
      if (!connectStatus) {
        return;
      }
      connectStatus.textContent = message;
      connectStatus.dataset.variant = variant;
    };

    const renderTierSummary = (info) => {
      if (!tierSummary) {
        return;
      }
      if (!info) {
        tierSummary.innerHTML = 'Connect a wallet to view tier quotas and perks.';
        return;
      }
      const wallet = info.wallet ?? connectedWallet ?? '';
      const balance = info.balance ? formatTokens(info.balance) : null;
      const thresholds = info.thresholds ?? lastThresholds ?? {};
      lastThresholds = thresholds;
      const tier = info.tier ?? null;
      const eligible = Boolean(info.eligible && tier);
      const parts = [];

      if (wallet) {
        parts.push(
          '<p><strong>Connected wallet:</strong> <code>' + escapeHtml(wallet) + '</code></p>'
        );
      }
      if (balance) {
        parts.push('<p>Detected SOL402 balance: ' + escapeHtml(balance) + '</p>');
      }

      if (eligible && tier) {
        parts.push(
          '<p class="tier-summary__status">Eligible for the <strong>' +
            escapeHtml(tier.label ?? tier.id) +
            '</strong> tier.</p>'
        );
        parts.push('<ul>');
        parts.push(
          '<li>' +
            escapeHtml(String(tier.dailyRequestCap)) +
            ' paid calls/day, ' +
            escapeHtml(String(tier.maxActiveLinks)) +
            ' active links</li>'
        );
        if (info.discountEligible) {
          parts.push('<li>25% holder discount unlocked.</li>');
        } else if (info.freeCallsEligible) {
          parts.push('<li>5 free calls/day unlocked.</li>');
        }
        parts.push('</ul>');
      } else {
        const baseline = thresholds?.baseline ? formatTokens(thresholds.baseline) : '1,000,000';
        parts.push(
          '<p class="tier-summary__warning">Hold at least ' +
            escapeHtml(baseline) +
            ' SOL402 to unlock instant provisioning.</p>'
        );
      }

      tierSummary.innerHTML = parts.join('');
    };

    const renderSuccess = (result) => {
      if (!successEl) {
        return { hasWebhookSecret: false, hasWebhookUrl: false };
      }

      const tier = result?.tier ?? {};
      const tierLabel = typeof tier.label === 'string' ? tier.label : tier.id ?? 'Baseline';
      const quotaSummary =
        typeof tier.dailyRequestCap === 'number'
          ? String(tier.dailyRequestCap) +
            ' calls/day, up to ' +
            String(tier.maxActiveLinks ?? '∞') +
            ' links'
          : 'Quota info pending';
      const rawLinkUrl =
        typeof result?.linkUrl === 'string'
          ? result.linkUrl
          : result?.linkId
            ? window.location.origin + '/p/' + result.linkId
            : '';
      const linkUrl = rawLinkUrl || '';
      const apiKey = typeof result?.apiKey === 'string' ? result.apiKey : '';
      const walletBalance =
        typeof result?.walletBalance === 'string' ? formatTokens(result.walletBalance) : null;
      const webhook = result?.webhook ?? null;
      const webhookUrl =
        webhook && typeof webhook.url === 'string' && webhook.url.length > 0 ? webhook.url : null;
      const webhookSecret =
        webhook && typeof webhook.secret === 'string' && webhook.secret.length > 0
          ? webhook.secret
          : null;
      const webhookSecretPreview =
        !webhookSecret && webhook && typeof webhook.secretPreview === 'string'
          ? webhook.secretPreview
          : null;

      const rows = [
        '<li>Tier: ' + escapeHtml(tierLabel) + ' (' + escapeHtml(quotaSummary) + ')</li>',
      ];
      if (linkUrl) {
        rows.push(
          '<li>Paywalled link: <a href="' +
            escapeHtml(linkUrl) +
            '" target="_blank" rel="noopener">' +
            escapeHtml(linkUrl) +
            '</a></li>'
        );
      }
      if (apiKey) {
        rows.push('<li>API key (store securely): <code>' + escapeHtml(apiKey) + '</code></li>');
      }
      if (walletBalance) {
        rows.push('<li>Detected SOL402 balance: ' + escapeHtml(walletBalance) + '</li>');
      }
      if (webhookUrl) {
        rows.push('<li>Webhook URL: <code>' + escapeHtml(webhookUrl) + '</code></li>');
        if (webhookSecret) {
          rows.push('<li>Webhook secret: <code>' + escapeHtml(webhookSecret) + '</code></li>');
        } else if (webhookSecretPreview) {
          rows.push(
            '<li>Webhook secret preview: <code>' + escapeHtml(webhookSecretPreview) + '</code></li>'
          );
        }
      }

      const actions = [];
      if (apiKey) {
        actions.push(
          '<a class="button secondary" href="' +
            escapeHtml(window.location.origin + '/dashboard?key=' + encodeURIComponent(apiKey)) +
            '" data-analytics-click="builder_open_dashboard">Open dashboard</a>'
        );
        actions.push(
          '<button type="button" class="button secondary" data-copy="' +
            escapeHtml(apiKey) +
            '" data-copy-label="Copy API key" data-copy-success="Copied!" data-analytics-click="builder_copy_api_key">Copy API key</button>'
        );
      }
      if (webhookSecret) {
        actions.push(
          '<button type="button" class="button secondary" data-copy="' +
            escapeHtml(webhookSecret) +
            '" data-copy-label="Copy webhook secret" data-copy-success="Copied!" data-analytics-click="builder_copy_webhook_secret">Copy webhook secret</button>'
        );
      }
      if (linkUrl) {
        actions.push(
          '<button type="button" class="button tertiary" data-copy="' +
            escapeHtml(linkUrl) +
            '" data-copy-label="Copy paywalled link" data-copy-success="Copied!" data-analytics-click="builder_copy_link_url">Copy paywalled link</button>'
        );
      }

      const notes = [];
      const primaryNote = webhookSecret
        ? 'Copy the API key and webhook secret now — we only show them once.'
        : 'Copy the API key now — we only show it once.';
      notes.push('<p class="success-note">' + escapeHtml(primaryNote) + '</p>');
      if (webhookUrl) {
        notes.push(
          '<p class="success-note">Webhooks use the secret as a Bearer token. Rotate it anytime from the dashboard.</p>'
        );
      }

      successEl.innerHTML =
        "<h3>You're live!</h3>" +
        '<ul>' +
        rows.join('') +
        '</ul>' +
        notes.join('') +
        (actions.length ? '<div class="success-actions">' + actions.join('') + '</div>' : '');
      successEl.removeAttribute('hidden');
      bindCopyButtons(successEl);

      return {
        hasWebhookSecret: Boolean(webhookSecret),
        hasWebhookUrl: Boolean(webhookUrl),
      };
    };

    const fetchTier = async (wallet) => {
      const response = await fetch('/link/tiers/' + encodeURIComponent(wallet), {
        headers: {
          'cache-control': 'no-cache',
        },
      });
      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok) {
        const errorMessage =
          body && typeof body.message === 'string'
            ? body.message
            : 'Unable to verify SOL402 balance.';
        throw new Error(errorMessage);
      }
      return body;
    };

    const connectWallet = async () => {
      const provider =
        (window.phantom && window.phantom.solana) || (window.solana ?? null);
      if (!provider || (!provider.isPhantom && !provider.isWallet)) {
        setConnectStatus('Phantom wallet not detected. Install it and try again.', 'error');
        return;
      }

      clearSuccess();
      setStatus('');
      setConnectStatus('Connecting to Phantom…', 'info');

      try {
        const result = await provider.connect();
        const publicKey =
          result?.publicKey?.toString?.() ?? provider.publicKey?.toString?.();
        if (!publicKey) {
          throw new Error('Unable to determine wallet address.');
        }

        connectedWallet = publicKey;
        if (merchantInput) {
          merchantInput.value = publicKey;
        }

        setConnectStatus('Wallet connected. Checking SOL402 tier…', 'info');
        const tierInfo = await fetchTier(publicKey);
        currentTier = tierInfo;
        renderTierSummary(tierInfo);

        if (tierInfo?.eligible) {
          configSection?.removeAttribute('hidden');
          submitButton?.removeAttribute('disabled');
          setConnectStatus('Wallet verified — ready to mint.', 'success');
          setStatus('Ready when you are.', 'info');
        } else {
          configSection?.setAttribute('hidden', 'true');
          submitButton?.setAttribute('disabled', 'true');
          const baseline =
            tierInfo?.thresholds?.baseline ? formatTokens(tierInfo.thresholds.baseline) : '1,000,000';
          setConnectStatus(
            'Not enough SOL402 yet. Hold at least ' + baseline + ' tokens to continue.',
            'error'
          );
          setStatus('Add more SOL402 to your wallet, then reconnect to unlock the builder.', 'error');
        }

        if (typeof window.sol402Track === 'function') {
          try {
            window.sol402Track('link_builder_wallet_connected', {
              wallet: publicKey,
              eligible: Boolean(tierInfo?.eligible),
              tier: tierInfo?.tier?.id ?? null,
            });
          } catch (trackingError) {
            console.warn('sol402Track failed', trackingError);
          }
        }
      } catch (error) {
        const message =
          error && typeof error.message === 'string'
            ? error.message
            : 'Wallet connection failed. Please retry.';
        setConnectStatus(message, 'error');
      }
    };

    connectButton?.addEventListener('click', connectWallet);

    if (form && statusEl && submitButton) {
      submitButton.setAttribute('disabled', 'true');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearSuccess();

        if (!connectedWallet || !currentTier?.eligible) {
          setStatus('Connect a wallet with sufficient SOL402 to proceed.', 'error');
          return;
        }

        if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
          return;
        }

        const formData = new FormData(form);
        const originValue = getStringValue(formData, 'origin');
        if (!originValue) {
          setStatus('Origin URL is required.', 'error');
          return;
        }

        const priceUsdValue = getStringValue(formData, 'priceUsd');
        const contactEmailValue = getStringValue(formData, 'contactEmail');
        const notesValue = getStringValue(formData, 'notes');
        const webhookUrlValue = getStringValue(formData, 'webhookUrl');
        const webhookSecretValue = getStringValue(formData, 'webhookSecret');

        if (!webhookUrlValue && webhookSecretValue) {
          setStatus('Add a webhook URL before supplying a secret.', 'error');
          return;
        }

        const payload = {
          origin: originValue,
          merchantAddress: connectedWallet,
        };
        if (priceUsdValue) {
          payload.priceUsd = priceUsdValue;
        }
        if (contactEmailValue) {
          payload.contactEmail = contactEmailValue;
        }
        if (notesValue) {
          payload.notes = notesValue;
        }
        if (webhookUrlValue) {
          payload.webhookUrl = webhookUrlValue;
        }
        if (webhookSecretValue) {
          payload.webhookSecret = webhookSecretValue;
        }

        setStatus('Minting your link…', 'info');
        submitButton.setAttribute('disabled', 'true');

        try {
          const response = await fetch('/link/requests', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => null);
            const message =
              body && typeof body.message === 'string'
                ? body.message
                : 'Unable to mint the link right now.';
            throw new Error(message);
          }
          const result = await response.json();
          const successMeta = renderSuccess(result);
          const successMessage = successMeta?.hasWebhookSecret
            ? 'Done! Copy your API key and webhook secret before leaving the page.'
            : 'Done! Copy your API key before leaving the page.';
          setStatus(successMessage, 'success');
          form.reset();
          if (merchantInput && connectedWallet) {
            merchantInput.value = connectedWallet;
          }
          submitButton.removeAttribute('disabled');
        } catch (error) {
          const message =
            error && typeof error.message === 'string'
              ? error.message
              : 'Something went wrong while minting the link.';
          setStatus(message, 'error');
          submitButton.removeAttribute('disabled');
        }
      });
    }
  </script>
</section>`;

const linkBuilderFaq = html`<section class="link-builder-faq">
  <div class="section__header">
    <h2>Quick answers</h2>
    <p class="section__subhead">
      Everything you need to know before turning on the builder. For deeper dives, the docs cover the
      full API.
    </p>
  </div>
  <div class="link-builder-faq__accordion">
    <details open>
      <summary>
        <span>Can I mint more than three links?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        Baseline starts with 3 live links. Growth unlocks 10, Premium unlocks 20. Need more? Email us and
        we’ll review higher caps tied to your volume.
      </p>
    </details>
    <details>
      <summary>
        <span>What if my wallet doesn’t hold enough SOL402?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        The builder disables provisioning until you reach ≥1M SOL402. You can still use the admin API, but
        links won’t auto-provision without the required balance.
      </p>
    </details>
    <details>
      <summary>
        <span>Do you store my API key?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        We only show your scoped admin key once after minting. Store it securely—future rotations are
        self-serve from the dashboard.
      </p>
    </details>
    <details>
      <summary>
        <span>Does the builder support non-Phantom wallets?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        Phantom ships today. Solflare and Backpack are on the roadmap once their x402 providers land. Until
        then, you can always call the admin API with your own tooling.
      </p>
    </details>
  </div>
</section>`;

const linkBuilderSupport = html`<section class="link-builder-support">
  <div class="link-builder-support__content">
    <h2>Ready to go bigger?</h2>
    <p>
      We’ll help model traffic, automate analytics exports, and ship custom quotas for enterprise agent
      workloads. Leave the onboarding to SOL402 and focus on your product.
    </p>
  </div>
  <div class="link-builder-support__actions">
    <a class="button primary" href="mailto:admin@sol402.app">Talk to us</a>
    <a class="button secondary" href="/pricing">See pricing</a>
  </div>
</section>`;

const homeHero = html`<section class="hero hero--home">
  <div class="hero__content" data-animate="fade-up">
    <div class="hero__heading">
      ${brandBadge('hero')}
      <div class="hero__heading-copy">
        <span class="eyebrow">SOL402 • X402 NATIVE</span>
        <h1>Paywall anything in under 10 seconds</h1>
      </div>
    </div>
    <p class="subhead">
      Connect your wallet, point us at a URL, and spin up a pay-per-request endpoint that settles in USDC
      on Solana. Agents, browsers, and bots all follow the same 402 → pay → retry handshake.
    </p>
    <div class="hero__actions cta-row">
      <a class="button primary" href="/link/request" data-analytics-click="click_create_link">
        Launch the builder
      </a>
      <a class="button secondary" href="/docs/quickstart" data-analytics-click="view_docs">
        Read the docs
      </a>
      <a class="button secondary" href="/demo" data-analytics-click="view_demo">
        Watch the demo
      </a>
    </div>
    <div class="hero-metrics" data-analytics-click="home_metrics" hidden>
      <div class="hero-metric" data-animate="fade-up">
        <span class="hero-metric__label">Requests served</span>
        <span class="hero-metric__value" data-metric="requests">128,940</span>
        <span class="hero-metric__hint">Realtime paywalled calls routed</span>
      </div>
      <div class="hero-metric" data-animate="fade-up" data-animate-delay="90">
        <span class="hero-metric__label">USDC settled</span>
        <span class="hero-metric__value" data-metric="settled">$6,447.12</span>
        <span class="hero-metric__hint">Direct to your merchant wallet</span>
      </div>
      <div class="hero-metric" data-animate="fade-up" data-animate-delay="180">
        <span class="hero-metric__label">SOL402 in circulation</span>
        <span class="hero-metric__value" data-metric="supply">18.3M</span>
        <span class="hero-metric__hint">Baseline tier opens at 1M tokens</span>
      </div>
    </div>
  </div>
  <div class="hero__visual hero__visual--empty" aria-hidden="true"></div>
</section>`;

const homeSocialProof = html`<section class="section section--social">
  <div class="social-strip" data-animate="fade-up" data-animate-delay="140">
    <span class="social-strip__label">Backed by builders shipping the x402 stack</span>
    <div class="social-strip__logos" aria-label="Partners powering Sol402">
      <img src="/assets/partners/payai.png" alt="PayAI" loading="lazy" decoding="async" />
      <img src="/assets/partners/solana.png" alt="Solana" loading="lazy" decoding="async" />
      <img src="/assets/partners/cloudflare.png" alt="Cloudflare" loading="lazy" decoding="async" />
      <img src="/assets/partners/clickhouse.png" alt="ClickHouse" loading="lazy" decoding="async" />
      <img src="/assets/partners/extrnode.png" alt="Extrnode" loading="lazy" decoding="async" />
    </div>
  </div>
</section>`;

const homeHowItWorks = html`<section class="section section--steps">
  <div class="section__header" data-animate="fade-up">
    <h2>Ship the 402 handshake in minutes</h2>
    <p class="section__subhead">
      No SDK lock-in. We verify the payment, route the request, and stream the exact origin response
      back to the caller.
    </p>
  </div>
  <div class="steps-layout">
    <div class="steps-grid">
      <article class="step-card" data-animate="fade-up">
        <span class="step-card__index">01</span>
        <h3 class="step-card__title">Generate your link</h3>
        <p class="step-card__body">
          Connect Phantom, paste your origin URL, choose a price, and we mint a scoped Admin API key +
          dashboard in a single response.
        </p>
      </article>
      <article class="step-card" data-animate="fade-up" data-animate-delay="90">
        <span class="step-card__index">02</span>
        <h3 class="step-card__title">Serve the challenge</h3>
        <p class="step-card__body">
          First call returns <code>402 Payment Required</code> with a PayAI-compatible payload. Agents or
          humans pay via any Solana wallet.
        </p>
      </article>
      <article class="step-card" data-animate="fade-up" data-animate-delay="180">
        <span class="step-card__index">03</span>
        <h3 class="step-card__title">Get paid automatically</h3>
        <p class="step-card__body">
          Once the facilitator confirms settlement, Sol402 proxies the response 1:1 from your origin.
          Funds land directly in your merchant wallet.
        </p>
      </article>
    </div>
    <div class="steps-visual" data-animate="scale-in" data-animate-delay="220">
      <img
        src="/assets/home-flow.png"
        alt="Three step paywall flow: challenge, PayAI facilitator, paid response"
        loading="lazy"
        decoding="async"
      />
    </div>
  </div>
</section>`;

const homeFeatureGrid = html`<section class="section section--features">
  <div class="section__header" data-animate="fade-up">
    <h2>Designed for fast paywalls and faster iteration</h2>
    <p class="section__subhead">
      Auto-provisioned infrastructure, dynamic pricing, and token-native perks straight out of the box.
    </p>
  </div>
  <div class="feature-grid">
    <article class="feature-card" data-animate="fade-up">
      <h3>Instant onboarding</h3>
      <p>
        Connect your wallet, choose an origin, and we mint scoped credentials plus a dashboard in one
        response.
      </p>
      <ul>
        <li>Scoped Admin API key per merchant</li>
        <li>Wallet custody always stays with you</li>
      </ul>
    </article>
    <article class="feature-card" data-animate="fade-up" data-animate-delay="90">
      <h3>Dynamic pricing</h3>
      <p>
        Price URLs and APIs independently. Adjust on demand or hook into your own logic via the admin API.
      </p>
      <ul>
        <li>Per-link USD pricing</li>
        <li>Token discounts applied automatically</li>
      </ul>
    </article>
    <article class="feature-card" data-animate="fade-up" data-animate-delay="180">
      <h3>SOL402 utility</h3>
      <p>
        Holders unlock discounted calls, higher quotas, and automation-only onboarding with no manual
        review.
      </p>
      <ul>
        <li>1M tokens: instant access + free calls</li>
        <li>2M tokens: 25% discount, more capacity</li>
      </ul>
    </article>
    <article class="feature-card" data-animate="fade-up" data-animate-delay="270">
      <h3>Analytics that ship</h3>
      <p>
        Real-time dashboard backed by ClickHouse, with exports to your Grafana or custom sinks.
      </p>
      <ul>
        <li>Per-link metrics in 60s windows</li>
        <li>Webhook & CSV exports on roadmap</li>
      </ul>
    </article>
  </div>
</section>`;

const homeAnalytics = html`<section class="section section--analytics" hidden>
  <div class="section__header" data-animate="fade-up">
    <h2>Your dashboard, streaming in real time</h2>
    <p class="section__subhead">
      Track revenue, quota burn, top referrers, and paid events seconds after they happen.
    </p>
  </div>
  <p class="analytics-note" data-animate="fade-up" data-animate-delay="60">
    Sample dashboard for illustration — sign in to view live metrics.
  </p>
  <div class="analytics-grid">
    <article class="analytics-panel analytics-panel--summary" data-animate="fade-up">
      <header>
        <span class="analytics-chip analytics-chip--live">Live data</span>
        <p class="analytics-caption analytics-caption--inline">Past 7 days, net USDC routed</p>
      </header>
      <strong class="analytics-value">$1,482.30</strong>
      <ul class="panel-body">
        <li>
          <span>Paid requests (24h)</span>
          <span>3,482</span>
        </li>
        <li>
          <span>Conversion rate</span>
          <span>62%</span>
        </li>
        <li>
          <span>Free calls used</span>
          <span>128 / 450</span>
        </li>
      </ul>
    </article>
    <article class="analytics-panel analytics-panel--trend" data-animate="fade-up" data-animate-delay="90">
      <header>
        <span class="analytics-chip">Daily trend</span>
        <span class="analytics-caption analytics-caption--inline">Requests per day</span>
      </header>
      <div class="analytics-chart panel-body" data-trend-chart>
        <span class="sr-only">Sample daily trend chart preview</span>
      </div>
      <footer>
        <span>Top referrer</span>
        <strong>agents.sol402.app</strong>
      </footer>
    </article>
    <article class="analytics-panel analytics-panel--activity" data-animate="fade-up" data-animate-delay="180">
      <header>
        <span class="analytics-chip">Recent activity</span>
      </header>
      <ul class="activity-feed panel-body">
        <li>
          <span>Paid • arxiv.pdf</span>
          <time>34s ago</time>
        </li>
        <li>
          <span>Free quota • docs.json</span>
          <time>2m ago</time>
        </li>
        <li>
          <span>Discounted • api/v1/search</span>
          <time>5m ago</time>
        </li>
      </ul>
      <footer>
        <a class="footer-link" href="/dashboard" data-analytics-click="home_view_dashboard">
          View dashboard →
        </a>
      </footer>
    </article>
  </div>
</section>`;

const homeToken = html`<section class="section section--token" data-animate="fade-up" data-animate-delay="140">
  <div class="section__header">
    <h2>Make SOL402 work for you</h2>
    <p class="section__subhead">
      Token holders unlock instant onboarding, discounts, and roadmap perks. Contract:
      <a
        class="token-ca"
        href="https://dexscreener.com/solana/6h8d1kjngp2ainxzv4bud9hpdlkb1zdydrpfom1b8a8k"
        target="_blank"
        rel="noopener noreferrer"
      >
        HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump
      </a>
    </p>
  </div>
  <div class="tier-grid">
    <article class="tier-card tier-card--baseline">
      <header>
        <span class="pill pill--baseline">Baseline · ≥1M SOL402</span>
      </header>
      <ul>
        <li>Instant onboarding & admin key minting</li>
        <li>Up to 3 links, 200 paid calls/day</li>
        <li>5 free calls per wallet daily</li>
      </ul>
    </article>
    <article class="tier-card tier-card--growth">
      <header>
        <span class="pill pill--growth">Growth · ≥2M SOL402</span>
      </header>
      <ul>
        <li>25% discount on every paid call</li>
        <li>10 concurrent links, 500 paid calls/day</li>
        <li>Priority RPC and retry lanes</li>
      </ul>
    </article>
    <article class="tier-card tier-card--premium">
      <header>
        <span class="pill pill--premium">Premium · ≥5M SOL402</span>
      </header>
      <ul>
        <li>2,000 paid calls/day & 20 active links</li>
        <li>Webhooks, ClickHouse sync, revenue reports</li>
        <li>Early access to custodial payouts & UI pricing tweaks</li>
      </ul>
    </article>
  </div>
</section>`;
const homeCta = html`<section class="cta-band" data-animate="fade-up" data-animate-delay="220">
  <div class="cta-band__content">
    <h2>Ready to monetize every request?</h2>
    <p>
      Launch a pay-per-request endpoint in minutes. Connect your wallet, set your price, and start routing
      USDC today.
    </p>
  </div>
  <div class="cta-band__actions">
    <a class="button primary" href="/link/request" data-analytics-click="click_create_link">
      Launch the builder
    </a>
    <a class="button secondary" href="/docs/quickstart" data-analytics-click="view_docs">
      Dive into docs
    </a>
  </div>
</section>`;

export const renderHome: RenderFn = () =>
  renderPage({
    title: 'Sol402 — Turn any URL or API into a pay-per-request endpoint',
    description:
      'Drop-in paywalls for the agent economy. x402-native payments using USDC on Solana. No accounts, no API keys—just HTTP 402.',
    ogTitle: 'Pay-per-request for anything on the web',
    ogDescription: 'x402-native payments. USDC on Solana. Ship in minutes.',
    path: '/',
    analyticsEvent: 'view_home',
    content: html`${homeHero}${homeSocialProof}${homeHowItWorks}${homeFeatureGrid}${homeAnalytics}${homeToken}${homeCta}`,
  });

const renderApi: RenderFn = () =>
  renderPage({
    title: 'Paywall your API with x402 in minutes',
    description:
      'Add a standard HTTP 402 flow to your endpoints. Get paid in USDC on Solana with one middleware.',
    ogTitle: 'Add x402 to your API',
    ogDescription: 'Standard 402 → pay → retry. USDC on Solana. Works with agents.',
    path: '/api',
    analyticsEvent: 'view_api',
    content: html`<section class="hero">
        <h1>Add x402 to your API in minutes</h1>
        <p class="subhead">
          Expose any endpoint behind a standard 402 challenge. Verified payment → we forward the request
          to your origin.
        </p>
        <div class="cta-row">
          <a class="button primary" href="/docs/quickstart" data-analytics-click="view_docs">
            Read the quickstart
          </a>
          <a class="button secondary" href="/link/request" data-analytics-click="click_create_link">
            Launch App
          </a>
        </div>
      </section>
      <section class="card">
        <h2>Checklist</h2>
        <ul>
          <li>□ Hono/Node middleware</li>
          <li>□ Solana network (USDC-SPL)</li>
          <li>□ Works with agents &amp; bots</li>
          <li>□ No API keys required</li>
        </ul>
      </section>
      <section>
        <h2>Implementation snapshot</h2>
        <pre><code>${escapeHtml(`// Configure price & network (Solana)
paymentMiddleware(payTo, {
  "/p/:id": async (c) => ({ price: 5000, network: "solana", asset: process.env.${'USDC_MINT'} })
}, { url: process.env.${'FACILITATOR_URL'} })
`)}</code></pre>
      </section>
      <section class="grid-2">
        <div class="card">
          <h2>Dev benefits</h2>
          <ul>
            <li>Simple: You focus on your API; we handle 402, verify &amp; settle.</li>
            <li>Agent-ready: No UI flow required—just HTTP headers.</li>
            <li>Flexible: Per-link pricing, discounts for token holders.</li>
          </ul>
        </div>
        <div class="card">
          <div class="cta-row">
            <a class="button secondary" href="/docs/quickstart" data-analytics-click="view_docs">
              View examples
            </a>
            <button
              class="button secondary"
              type="button"
              data-copy="${escapeHtml(CREATE_LINK_CURL)}"
              data-copy-success="Copied!"
              data-copy-label="Copy curl"
              data-analytics-click="click_copy_curl"
            >
              Copy curl
            </button>
            <a class="button primary" href="/docs/quickstart" data-analytics-click="view_docs">
              Open docs
            </a>
          </div>
        </div>
      </section>`,
  });

const pricingHero = html`<section class="section pricing-hero">
  <div class="pricing-hero__grid">
    <div class="pricing-hero__copy" data-animate="fade-up">
      ${brandBadge('hero', { decorative: true })}
      <span class="eyebrow">Pricing</span>
      <h1>Only pay when a request clears</h1>
      <p class="subhead">
        Ship a meter that charges on every successful 402 retry. No SaaS plans, no custody—USDC routes
        straight to the wallet you choose.
      </p>
      <div class="pricing-hero__actions cta-row">
        <a class="button primary" href="/link/request" data-analytics-click="pricing_launch_builder">
          Launch the builder
        </a>
        <a class="button secondary" href="/docs/quickstart" data-analytics-click="pricing_view_docs">
          View integration guide
        </a>
      </div>
    </div>
    <aside class="pricing-hero__capsule" data-animate="scale-in" data-animate-delay="180">
      <header>
        <span class="pricing-chip">Base rate</span>
        <strong>$0.005</strong>
        <small>per confirmed request</small>
      </header>
      <ul>
        <li>≥1M SOL402 → 5 free calls/day</li>
        <li>≥2M SOL402 → 25% discount applied automatically</li>
        <li>≥5M SOL402 → higher quotas &amp; premium tooling</li>
      </ul>
      <footer>
        <p>
          Meter resets every UTC midnight. We auto-detect your tier the moment your wallet connects and
          never hold funds in custody.
        </p>
      </footer>
    </aside>
  </div>
</section>`;

const pricingCalculator = html`<section class="section pricing-estimator">
  <div class="section__header">
    <h2>Model your daily spend</h2>
    <p class="section__subhead">
      Drag the slider, pick your SOL402 tier, and see how discounts plus free calls affect the bottom
      line. The live dashboard mirrors these numbers in real time.
    </p>
  </div>
  <div class="pricing-estimator__grid">
    <div class="pricing-estimator__controls">
      <header>
        <span class="pricing-chip">Estimator</span>
        <h3>Configure your scenario</h3>
        <p>We’ll auto-populate tier + usage once you connect a wallet.</p>
      </header>
      <div class="estimator-control">
        <label for="dailyRequests">Daily paid requests</label>
        <div class="estimator-control__value">
          <strong data-estimator-value>1,200</strong>
          <span>calls/day</span>
        </div>
        <input
          id="dailyRequests"
          type="range"
          min="100"
          max="5000"
          step="50"
          value="1200"
          data-estimator="requests"
        />
        <div class="estimator-scale">
          <span>100</span>
          <span>2.5K</span>
          <span>5K</span>
        </div>
      </div>
      <div class="estimator-control">
        <span class="estimator-control__label">Your SOL402 tier</span>
        <div class="tier-toggle" role="radiogroup">
          <button
            type="button"
            class="tier-toggle__btn is-active"
            data-estimator-tier="baseline"
            aria-pressed="true"
          >
            Baseline
            <small>≥1M tokens</small>
          </button>
          <button
            type="button"
            class="tier-toggle__btn"
            data-estimator-tier="growth"
            aria-pressed="false"
          >
            Growth
            <small>≥2M tokens</small>
          </button>
          <button
            type="button"
            class="tier-toggle__btn"
            data-estimator-tier="premium"
            aria-pressed="false"
          >
            Premium
            <small>≥5M tokens</small>
          </button>
        </div>
      </div>
      <p class="estimator-note">
        Need custom min/max pricing or large asset handling? Email
        <a href="mailto:admin@sol402.app">admin@sol402.app</a>.
      </p>
    </div>
    <div class="pricing-estimator__summary">
      <header>
        <h3>Projected spend (per day)</h3>
        <p>Assumes base price $0.005 and standard SOL402 perks.</p>
      </header>
      <dl>
        <div>
          <dt>Base meter</dt>
          <dd data-estimator-base>$6.00</dd>
        </div>
        <div>
          <dt>Tier discount</dt>
          <dd data-estimator-discount>−$0.00</dd>
        </div>
        <div>
          <dt>Free calls credit</dt>
          <dd data-estimator-free>−$0.03</dd>
        </div>
      </dl>
      <footer>
        <span>Total</span>
        <strong data-estimator-total>$5.97</strong>
        <span>/ day</span>
      </footer>
      <p class="summary-note">
        Full calculator automation lands next—today your dashboard reflects the exact totals as usage
        comes in.
      </p>
    </div>
  </div>
  <script>
    (() => {
      const PRICE_PER_REQUEST = 0.005;
      const FREE_CALLS = { baseline: 5, growth: 5, premium: 5 };
      const DISCOUNTS = { baseline: 0, growth: 0.25, premium: 0.25 };

      const formatNumber = new Intl.NumberFormat('en-US');
      const formatCurrency = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const container = document.currentScript?.parentElement;
      const requestsInput = container?.querySelector('[data-estimator=\"requests\"]');
      const requestValueEl = container?.querySelector('[data-estimator-value]');
      const baseEl = container?.querySelector('[data-estimator-base]');
      const discountEl = container?.querySelector('[data-estimator-discount]');
      const freeEl = container?.querySelector('[data-estimator-free]');
      const totalEl = container?.querySelector('[data-estimator-total]');
      const tierButtons = Array.from(container?.querySelectorAll('[data-estimator-tier]') || []);

      if (!requestsInput || !requestValueEl || !baseEl || !discountEl || !freeEl || !totalEl) {
        console.warn('pricing estimator script missing nodes');
        return;
      }

      let currentTier = 'baseline';

      const compute = () => {
        const requests = Number.parseInt(requestsInput.value, 10) || 0;
        const discountRate = DISCOUNTS[currentTier] || 0;
        const freeCalls = FREE_CALLS[currentTier] || 0;

        const base = requests * PRICE_PER_REQUEST;
        const discount = base * discountRate;
        const freeCredit = Math.min(freeCalls, requests) * PRICE_PER_REQUEST;
        const total = Math.max(base - discount - freeCredit, 0);

        requestValueEl.textContent = formatNumber.format(requests);
        baseEl.textContent = formatCurrency.format(base);
        discountEl.textContent =
          discount === 0 ? '−$0.00' : '−' + formatCurrency.format(discount);
        freeEl.textContent =
          freeCredit === 0 ? '−$0.00' : '−' + formatCurrency.format(freeCredit);
        totalEl.textContent = formatCurrency.format(total);
      };

      const setTier = (tier) => {
        currentTier = tier;
        tierButtons.forEach((button) => {
          const isActive = button.dataset.estimatorTier === tier;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        compute();
      };

      requestsInput.addEventListener('input', compute);
      tierButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const tier = button.dataset.estimatorTier;
          if (!tier) return;
          setTier(tier);
        });
      });

      compute();
    })();
  </script>
</section>`;

const pricingTiers = html`<section class="section pricing-tiers">
  <div class="section__header">
    <h2>Unlock more automation with SOL402</h2>
    <p class="section__subhead">
      Your tier changes the moment your balance does. Higher holdings unlock deeper throughput and ops
      tooling—no support ticket required.
    </p>
  </div>
  <div class="pricing-tier-grid">
    <article class="pricing-tier-card">
      <header>
        <span class="pill pill--baseline">Baseline</span>
        <strong>≥1M SOL402</strong>
      </header>
      <p class="pricing-tier-card__summary">
        Launch instantly with automated onboarding and starter quotas tuned for agents, PDFs, and data
        feeds.
      </p>
      <ul>
        <li>Scoped admin key + dashboard minted automatically</li>
        <li>Up to 3 live links &amp; 200 paid calls/day</li>
        <li>5 free calls/day for rapid testing</li>
      </ul>
      <footer>
        <a class="button tertiary" href="/link/request" data-analytics-click="pricing_tier_baseline">
          Launch builder
        </a>
      </footer>
    </article>
    <article class="pricing-tier-card">
      <header>
        <span class="pill pill--growth">Growth</span>
        <strong>≥2M SOL402</strong>
      </header>
      <p class="pricing-tier-card__summary">
        Scale recurring workloads with automatic 25% discounts, higher concurrency, and better rate
        limits.
      </p>
      <ul>
        <li>25% discount applied to every paid call</li>
        <li>10 live links &amp; 500 paid calls/day</li>
        <li>Priority RPC retries + enhanced rate limits</li>
      </ul>
      <footer>
        <a class="button tertiary" href="/link/request" data-analytics-click="pricing_tier_growth">
          Launch builder
        </a>
      </footer>
    </article>
    <article class="pricing-tier-card">
      <header>
        <span class="pill pill--premium">Premium</span>
        <strong>≥5M SOL402</strong>
      </header>
      <p class="pricing-tier-card__summary">
        Operate at network scale with premium analytics, automation hooks, and higher throughput caps.
      </p>
      <ul>
        <li>2,000 paid calls/day &amp; 20 concurrent links</li>
        <li>Webhooks, ClickHouse sync, revenue reports (beta)</li>
        <li>Early access to custodial payout mode &amp; UI price edits</li>
      </ul>
      <footer>
        <a class="button tertiary" href="/link/request" data-analytics-click="pricing_tier_premium">
          Launch builder
        </a>
      </footer>
    </article>
  </div>
</section>`;

const pricingFaq = html`<section class="section pricing-faq">
  <div class="section__header">
    <h2>Pricing FAQ</h2>
    <p class="section__subhead">
      Quick answers before you flip the switch. Need more detail? Reach out—we’ll walk through your
      workload.
    </p>
  </div>
  <div class="faq-accordion">
    <details class="faq-item" open>
      <summary>
        <span>Do you charge monthly?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        No. Every charge maps to a completed 402 retry. If your endpoint sees no traffic, you pay
        nothing.
      </p>
    </details>
    <details class="faq-item">
      <summary>
        <span>Who receives the USDC?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        You do. Sol402 is non-custodial—funds route directly to the merchant wallet you set during link
        provisioning.
      </p>
    </details>
    <details class="faq-item">
      <summary>
        <span>Can I run dynamic pricing per request?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        Yes. Use the admin API to override price per link or work with us on request-aware resolvers that
        inspect payloads/headers before quoting.
      </p>
    </details>
    <details class="faq-item">
      <summary>
        <span>How are Solana network fees handled?</span>
        <span class="faq-chevron">➜</span>
      </summary>
      <p>
        Clients pay Solana fees when submitting the transaction. They’re fractions of a cent; for
        heavyweight assets we can configure higher minimums.
      </p>
    </details>
  </div>
</section>`;

const pricingContact = html`<section class="pricing-contact">
  <div class="pricing-contact__content">
    <h2>Enterprise or special pricing?</h2>
    <p>
      We’ll help model high-volume, archival, or inference-heavy workloads. Share your targets and we’ll
      spin up a dedicated tier.
    </p>
  </div>
  <div class="pricing-contact__actions">
    <a class="button primary" href="mailto:admin@sol402.app">Contact us</a>
    <a class="button secondary" href="/docs/quickstart">Read the docs</a>
  </div>
</section>`;

const renderDashboard: RenderFn = () =>
  renderPage({
    title: 'Dashboard — Manage Sol402 paywalled links',
    description: 'Paste your Sol402 API key to view usage, quotas, and links minted for your wallet.',
    path: '/dashboard',
    analyticsEvent: 'view_dashboard',
    content: html`<section class="dashboard-hero">
        <div class="dashboard-hero__inner">
          <div class="dashboard-hero__copy">
            <span class="eyebrow">Publisher console</span>
            <h1>Your Sol402 control center</h1>
            <p class="subhead">
              Track paid usage in real time, confirm your tier perks, and rotate keys without leaving the
              browser. Everything the self-serve builder minted for you lives here.
            </p>
            <ul class="dashboard-hero__metrics">
              <li>
                <strong>Live analytics</strong>
                <span>Paid vs free calls update every 60 seconds.</span>
              </li>
              <li>
                <strong>Tier-aware quotas</strong>
                <span>Discounts &amp; free calls unlock automatically from your SOL402 balance.</span>
              </li>
              <li>
                <strong>Secure by default</strong>
                <span>API keys stay on-device with instant forget controls.</span>
              </li>
            </ul>
            <div class="cta-row">
              <a
                class="button primary"
                href="/link/request"
                data-analytics-click="dashboard_request_link"
              >
                Launch builder
              </a>
              <a class="button secondary" href="/pricing" data-analytics-click="dashboard_view_pricing">
                View pricing
              </a>
              <a class="button tertiary" href="/docs/quickstart" data-analytics-click="dashboard_view_docs">
                Integration guide
              </a>
            </div>
          </div>
          <aside class="dashboard-hero__panel">
            <div class="dashboard-login">
              <header class="dashboard-login__header">
                <h2>Authenticate with your scoped key</h2>
                <p>Paste the API key you received after minting a link. We only store it locally.</p>
              </header>
              <form id="dashboard-login-form" class="dashboard-form" novalidate>
                <label>
                  <span>Sol402 API key</span>
                  <input
                    id="dashboard-api-key"
                    name="apiKey"
                    type="text"
                    autocomplete="off"
                    placeholder="sol402-..."
                    required
                  />
                  <small>Tip: the success screen includes a shortcut to open this dashboard prefilled.</small>
                </label>
                <div class="dashboard-actions">
                  <button
                    type="submit"
                    class="button primary"
                    data-analytics-click="dashboard_submit_key"
                  >
                    View dashboard
                  </button>
                  <button
                    type="button"
                    id="dashboard-refresh"
                    class="button secondary"
                    data-analytics-click="dashboard_refresh"
                    hidden
                  >
                    Refresh data
                  </button>
                  <button
                    type="button"
                    id="dashboard-clear"
                    class="button tertiary"
                    data-analytics-click="dashboard_clear"
                    hidden
                  >
                    Forget key
                  </button>
                </div>
              </form>
              <p id="dashboard-status" class="status-message" data-variant="info"></p>
              <p class="dashboard-login__hint">
                Want to mint another link? Launch the builder and you’ll get a fresh scoped key instantly.
              </p>
            </div>
          </aside>
        </div>
      </section>
      <section class="dashboard-content" aria-live="polite">
        <div class="dashboard-cards">
      <section class="dashboard-card" id="dashboard-balance-card" hidden>
        <div class="dashboard-card__head">
          <h2>SOL402 balance</h2>
          <button
            type="button"
            class="button tertiary"
            id="dashboard-balance-refresh"
            data-analytics-click="dashboard_balance_refresh"
            hidden
          >
            Refresh balance
          </button>
        </div>
        <div id="dashboard-balance" class="dashboard-balance" aria-live="polite">
          <p class="dashboard-empty">Balance not available.</p>
        </div>
      </section>
      <section class="dashboard-card" id="dashboard-summary" hidden>
            <h2>Summary</h2>
            <div id="dashboard-summary-body" class="dashboard-summary"></div>
          </section>
          <section class="dashboard-card dashboard-card--wide" id="dashboard-stats-card" hidden>
            <div class="dashboard-card__head">
              <h2>Usage</h2>
              <span
                id="dashboard-updated"
                class="dashboard-updated"
                data-variant="info"
                aria-live="polite"
                hidden
              ></span>
            </div>
            <div id="dashboard-stats" class="dashboard-stats" aria-live="polite"></div>
          </section>
          <section class="dashboard-card" id="dashboard-trend-card" hidden>
            <div class="dashboard-card__head">
              <h2>Daily trend</h2>
            </div>
            <div class="dashboard-trends" aria-live="polite">
              <ul id="dashboard-trend-list" class="dashboard-trend-list"></ul>
            </div>
          </section>
          <section class="dashboard-card" id="dashboard-referrers-card" hidden>
            <div class="dashboard-card__head">
              <h2>Top referrers (24h)</h2>
            </div>
            <ul id="dashboard-referrers" class="dashboard-referrers" aria-live="polite"></ul>
          </section>
          <section class="dashboard-card" id="dashboard-webhooks-card" hidden>
            <div class="dashboard-card__head">
              <h2>Webhook delivery</h2>
              <span
                id="dashboard-webhooks-updated"
                class="dashboard-updated"
                data-variant="info"
                aria-live="polite"
                hidden
              ></span>
            </div>
            <div id="dashboard-webhooks" class="dashboard-webhooks" aria-live="polite">
              <p class="dashboard-empty">
                Webhook deliveries will appear here once webhooks are enabled for your tier.
              </p>
            </div>
          </section>
          <section class="dashboard-card dashboard-card--wide" id="dashboard-activity-card" hidden>
            <div class="dashboard-card__head">
              <h2>Recent activity</h2>
            </div>
            <div id="dashboard-activity" class="dashboard-activity" aria-live="polite"></div>
          </section>
          <section class="dashboard-card dashboard-card--wide" id="dashboard-links-card" hidden>
            <h2>Your links</h2>
            <div id="dashboard-links" class="dashboard-links">
              <p class="dashboard-empty">No links yet. Mint one from the self-serve flow.</p>
            </div>
          </section>
          <section class="dashboard-card dashboard-support">
            <h2>Need a hand?</h2>
            <p>
              Email <a href="mailto:admin@sol402.app">admin@sol402.app</a> for key rotation, quota boosts,
              or premium features. Mention your wallet so we can pull the right tier.
            </p>
            <div class="dashboard-support__actions">
              <a
                class="button secondary"
                href="https://dexscreener.com/solana/hsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump"
                target="_blank"
                rel="noreferrer"
              >
                Check SOL402 liquidity
              </a>
              <a class="button tertiary" href="/token">View token perks</a>
            </div>
          </section>
        </div>
      </section>
      <script type="module">
        const storageKey = 'sol402DashboardKey';
        const form = document.getElementById('dashboard-login-form');
        const apiKeyInput = document.getElementById('dashboard-api-key');
        const statusEl = document.getElementById('dashboard-status');
        const refreshButton = document.getElementById('dashboard-refresh');
        const clearButton = document.getElementById('dashboard-clear');
        const summaryCard = document.getElementById('dashboard-summary');
        const summaryBody = document.getElementById('dashboard-summary-body');
        const balanceCard = document.getElementById('dashboard-balance-card');
        const balanceBody = document.getElementById('dashboard-balance');
        const balanceRefreshButton = document.getElementById('dashboard-balance-refresh');
        const statsCard = document.getElementById('dashboard-stats-card');
        const statsGrid = document.getElementById('dashboard-stats');
        const trendCard = document.getElementById('dashboard-trend-card');
        const trendList = document.getElementById('dashboard-trend-list');
        const referrersCard = document.getElementById('dashboard-referrers-card');
        const referrersList = document.getElementById('dashboard-referrers');
        const webhooksCard = document.getElementById('dashboard-webhooks-card');
        const webhooksBody = document.getElementById('dashboard-webhooks');
        const webhooksUpdated = document.getElementById('dashboard-webhooks-updated');
        const activityCard = document.getElementById('dashboard-activity-card');
        const activityList = document.getElementById('dashboard-activity');
        const linksCard = document.getElementById('dashboard-links-card');
        const linksGrid = document.getElementById('dashboard-links');
        const updatedLabel = document.getElementById('dashboard-updated');
        const submitButton = form?.querySelector('button[type="submit"]');
        let currentKey = null;
        let isLoading = false;
        let metricsLoading = false;
        let webhooksLoading = false;
        const linkRegistry = new Map();

        const escapeHtml = (value) => {
          const span = document.createElement('span');
          span.textContent = String(value ?? '');
          return span.innerHTML;
        };

        const formatNumber = (value) =>
          Number(value ?? 0).toLocaleString('en-US', {
            maximumFractionDigits: 0,
          });

        const formatUsd = (value) =>
          '$' +
          Number(value ?? 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          });

        const formatDateTime = (iso) => {
          if (!iso) return '—';
          const parsed = new Date(iso);
          if (Number.isNaN(parsed.getTime())) {
            return '—';
          }
          return parsed.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          });
        };

        const formatDateLabel = (iso) => {
          if (!iso) return '—';
          const parsed = new Date(iso);
          if (Number.isNaN(parsed.getTime())) {
            return '—';
          }
          return parsed.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        };

        const formatUpdatedAt = (iso) => {
          if (!iso) return null;
          const parsed = new Date(iso);
          if (Number.isNaN(parsed.getTime())) {
            return null;
          }
          return parsed.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
        };

        const setStatus = (message, variant = 'info') => {
          if (!statusEl) return;
          if (!message) {
            statusEl.textContent = '';
            statusEl.dataset.variant = 'info';
            return;
          }
          statusEl.textContent = message;
          statusEl.dataset.variant = variant;
        };

        const setUpdated = (message, variant = 'info') => {
          if (!updatedLabel) return;
          if (!message) {
            updatedLabel.textContent = '';
            updatedLabel.setAttribute('hidden', 'true');
            updatedLabel.setAttribute('data-variant', 'info');
            return;
          }
          updatedLabel.textContent = message;
          updatedLabel.setAttribute('data-variant', variant);
          updatedLabel.removeAttribute('hidden');
        };

        const setLoading = (loading) => {
          isLoading = loading;
          if (submitButton) {
            submitButton.toggleAttribute('disabled', loading);
          }
          if (refreshButton && !refreshButton.hasAttribute('hidden')) {
            refreshButton.toggleAttribute('disabled', loading);
          }
        };

        const resetAnalyticsSections = () => {
          if (trendCard) trendCard.setAttribute('hidden', 'true');
          if (trendList) trendList.innerHTML = '';
          if (referrersCard) referrersCard.setAttribute('hidden', 'true');
          if (referrersList) referrersList.innerHTML = '';
          if (activityCard) activityCard.setAttribute('hidden', 'true');
          if (activityList) activityList.innerHTML = '';
        };

        const showControls = (visible) => {
          if (refreshButton) {
            refreshButton.toggleAttribute('hidden', !visible);
            if (!visible) {
              refreshButton.removeAttribute('disabled');
            }
          }
          if (clearButton) {
            clearButton.toggleAttribute('hidden', !visible);
          }
        };

        const clearContent = () => {
          if (summaryCard) summaryCard.setAttribute('hidden', 'true');
          if (statsCard) statsCard.setAttribute('hidden', 'true');
          if (linksCard) linksCard.setAttribute('hidden', 'true');
          if (balanceCard) balanceCard.setAttribute('hidden', 'true');
          if (summaryBody) summaryBody.innerHTML = '';
          if (statsGrid) statsGrid.innerHTML = '';
          if (balanceBody) balanceBody.innerHTML = '<p class="dashboard-empty">Balance not available.</p>';
          if (balanceRefreshButton) balanceRefreshButton.setAttribute('hidden', 'true');
          if (webhooksCard) webhooksCard.setAttribute('hidden', 'true');
          if (webhooksBody) {
            webhooksBody.innerHTML =
              '<p class="dashboard-empty">Webhook deliveries will appear here once webhooks are enabled for your tier.</p>';
          }
          if (webhooksUpdated) {
            webhooksUpdated.setAttribute('hidden', 'true');
            webhooksUpdated.textContent = '';
          }
          resetAnalyticsSections();
          if (linksGrid) {
            linksGrid.innerHTML =
              '<p class="dashboard-empty">No links yet. Mint one from the self-serve flow.</p>';
          }
          linkRegistry.clear();
          metricsLoading = false;
          setUpdated('');
        };

        clearContent();
        showControls(false);
        setStatus('', 'info');

        const tierClass = (tierId) => {
          if (tierId === 'premium') {
            return 'dashboard-pill dashboard-pill--premium';
          }
          if (tierId === 'growth') {
            return 'dashboard-pill dashboard-pill--growth';
          }
          return 'dashboard-pill dashboard-pill--baseline';
        };

        const track = (name, props) => {
          if (typeof window.sol402Track === 'function') {
            try {
              window.sol402Track(name, props || {});
            } catch (error) {
              console.warn('sol402Track failed', error);
            }
          }
        };

        const renderBalance = (payload) => {
          if (!balanceBody || !balanceCard) return;
          if (!payload || typeof payload !== 'object') {
            balanceBody.innerHTML = '<p class="dashboard-empty">Balance not available.</p>';
            balanceCard.setAttribute('hidden', 'true');
            return;
          }

          const balance = payload.balance ?? {};
          const eligibility = payload.eligibility ?? {};
          const currentTier = payload.currentTier ?? null;
          const nextTier = payload.nextTier ?? null;
          const thresholds = payload.thresholds ?? {};

          balanceBody.innerHTML = '';

          const primary = document.createElement('div');
          primary.className = 'dashboard-balance__primary';

          const amount = document.createElement('span');
          amount.className = 'dashboard-balance__amount';
          amount.textContent = balance.uiAmountString ?? '0';

          const subtitle = document.createElement('span');
          subtitle.className = 'dashboard-balance__subtitle';
          subtitle.textContent = 'SOL402 tokens';

          primary.append(amount, subtitle);
          balanceBody.append(primary);

          const badges = document.createElement('div');
          badges.className = 'dashboard-balance__badges';
          const makeBadge = (label, active) => {
            const pill = document.createElement('span');
            pill.className = 'dashboard-pill' + (active ? '' : ' dashboard-pill--inactive');
            pill.textContent = label;
            return pill;
          };
          badges.append(
            makeBadge('Free calls', Boolean(eligibility.freeCalls)),
            makeBadge('Growth discount', Boolean(eligibility.discount)),
            makeBadge('Premium perks', Boolean(eligibility.premium))
          );
          balanceBody.append(badges);

          const tierInfo = document.createElement('div');
          tierInfo.className = 'dashboard-balance__tiers';

          if (currentTier) {
            const current = document.createElement('p');
            current.innerHTML =
              '<strong>Current tier:</strong> ' +
              currentTier.label +
              ' · ' +
              formatNumber(Number(currentTier.dailyRequestCap ?? 0)) +
              ' paid calls/day';
            tierInfo.append(current);
          }

          if (nextTier) {
            const delta = nextTier.delta ? BigInt(nextTier.delta) : 0n;
            const next = document.createElement('p');
            const deltaUi = delta > 0n ? Number(delta) / 1_000_000 : 0;
            next.innerHTML =
              '<strong>Next tier (' +
              nextTier.label +
              '):</strong> ' +
              (delta > 0n
                ? deltaUi.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' SOL402 away'
                : 'Reached');
            tierInfo.append(next);
          }

          const thresholdsList = document.createElement('ul');
          thresholdsList.className = 'dashboard-balance__thresholds';
          const baselineItem = document.createElement('li');
          baselineItem.textContent =
            'Baseline free calls ≥ ' + formatNumber(Number(thresholds.baseline ?? 0));
          const growthItem = document.createElement('li');
          growthItem.textContent =
            'Growth discount ≥ ' + formatNumber(Number(thresholds.growth ?? 0));
          const premiumItem = document.createElement('li');
          premiumItem.textContent =
            'Premium perks ≥ ' + formatNumber(Number(thresholds.premium ?? 0));
          thresholdsList.append(baselineItem, growthItem, premiumItem);
          tierInfo.append(thresholdsList);

          if (balance.refreshedAt) {
            const refreshed = document.createElement('p');
            refreshed.className = 'dashboard-balance__refreshed';
            refreshed.textContent = 'Updated ' + formatUpdatedAt(balance.refreshedAt);
            tierInfo.append(refreshed);
          }

          balanceBody.append(tierInfo);
          balanceCard.removeAttribute('hidden');
          if (balanceRefreshButton) {
            balanceRefreshButton.removeAttribute('hidden');
            balanceRefreshButton.removeAttribute('disabled');
          }
        };

        const renderSummary = (payload) => {
          if (!summaryBody || !summaryCard) return;
          const tier = payload?.tier ?? {};
          const quotas = payload?.quotas ?? {};
          const tierId = tier.id ?? 'baseline';
          const tierLabel = typeof tier.label === 'string' ? tier.label : 'Baseline';
          const paidCap =
            typeof quotas.tierDailyRequestCap === 'number' && quotas.tierDailyRequestCap > 0
              ? formatNumber(quotas.tierDailyRequestCap) + ' paid calls/day'
              : 'Quota shared across links';
          const maxLinks =
            typeof quotas.tierMaxActiveLinks === 'number' && quotas.tierMaxActiveLinks > 0
              ? formatNumber(quotas.tierMaxActiveLinks) + ' active links'
              : 'Flexible link count';
          const freeCalls =
            typeof quotas.freeCallsPerDay === 'number'
              ? formatNumber(quotas.freeCallsPerDay) + ' free calls/day'
              : 'Free calls enabled';
          const linkCount = Array.isArray(payload?.links) ? payload.links.length : 0;

          summaryBody.innerHTML = '';

          const walletRow = document.createElement('div');
          walletRow.className = 'dashboard-summary__row';
          const walletLabel = document.createElement('strong');
          walletLabel.textContent = 'Merchant wallet:';
          const walletCode = document.createElement('code');
          walletCode.textContent = payload?.merchantAddress ?? '';
          walletRow.append(walletLabel, walletCode);
          summaryBody.append(walletRow);

          const tierRow = document.createElement('div');
          tierRow.className = 'dashboard-summary__row';
          const tierBadge = document.createElement('span');
          tierBadge.className = tierClass(tierId);
          tierBadge.textContent = tierLabel;
          tierRow.append(tierBadge);

          const paidSpan = document.createElement('span');
          paidSpan.className = 'dashboard-summary__detail';
          paidSpan.textContent = paidCap;
          tierRow.append(paidSpan);

          const maxSpan = document.createElement('span');
          maxSpan.className = 'dashboard-summary__detail';
          maxSpan.textContent = maxLinks;
          tierRow.append(maxSpan);

          const freeSpan = document.createElement('span');
          freeSpan.className = 'dashboard-summary__detail';
          freeSpan.textContent = freeCalls;
          tierRow.append(freeSpan);

          summaryBody.append(tierRow);

          const countRow = document.createElement('div');
          countRow.className = 'dashboard-summary__row';
          const countSpan = document.createElement('span');
          countSpan.textContent =
            formatNumber(linkCount) + ' live link' + (linkCount === 1 ? '' : 's') + '.';
          countRow.append(countSpan);
          summaryBody.append(countRow);

          summaryCard.removeAttribute('hidden');
        };

        const renderStats = (stats) => {
          if (!statsGrid || !statsCard) return;
          if (!stats || typeof stats !== 'object') {
            statsGrid.innerHTML = '';
            statsCard.setAttribute('hidden', 'true');
            return;
          }

          const totalPaid = Number(stats?.totalPaidCalls ?? 0);
          const paid24h = Number(stats?.paidCalls24h ?? 0);
          const totalFree = Number(stats?.totalFreeCalls ?? 0);
          const free24h = Number(stats?.freeCalls24h ?? 0);
          const totalRevenue = Number(stats?.totalRevenueUsd ?? 0);
          const revenue24h = Number(stats?.revenueUsd24h ?? 0);
          const lastPayment = stats?.lastPaymentAt ?? null;
          const freeLimit =
            typeof stats?.freeCallsDailyLimit === 'number' ? stats.freeCallsDailyLimit : null;
          const freeRemaining =
            typeof stats?.freeCallsRemaining === 'number' ? stats.freeCallsRemaining : null;

          const freeHintParts = [formatNumber(totalFree) + ' lifetime'];
          if (freeLimit !== null) {
            freeHintParts.push('limit ' + formatNumber(freeLimit) + ' / day');
          }
          if (freeRemaining !== null) {
            freeHintParts.push(formatNumber(freeRemaining) + ' remaining today');
          }

          const items = [
            {
              label: 'Paid calls (24h)',
              value: formatNumber(Number.isFinite(paid24h) ? paid24h : totalPaid),
              hint: formatNumber(totalPaid) + ' lifetime',
            },
            {
              label: 'Free calls (24h)',
              value: formatNumber(Number.isFinite(free24h) ? free24h : totalFree),
              hint: freeHintParts.join(' · '),
            },
            {
              label: 'Revenue (24h)',
              value: formatUsd(Number.isFinite(revenue24h) ? revenue24h : totalRevenue),
              hint: formatUsd(totalRevenue) + ' lifetime',
            },
            {
              label: 'Last payment',
              value: formatDateTime(lastPayment),
              hint: Number.isFinite(paid24h) ? formatNumber(paid24h) + ' paid calls today' : '',
            },
          ];

          statsGrid.innerHTML = '';
          for (const item of items) {
            const card = document.createElement('div');
            card.className = 'dashboard-stats__item';

            const labelEl = document.createElement('span');
            labelEl.className = 'dashboard-stats__label';
            labelEl.textContent = item.label;

            const valueEl = document.createElement('span');
            valueEl.className = 'dashboard-stats__value';
            valueEl.textContent = item.value;

            const hintEl = document.createElement('p');
            hintEl.className = 'dashboard-stats__hint';
            hintEl.textContent = item.hint;

            card.append(labelEl, valueEl, hintEl);
            statsGrid.append(card);
          }
          statsCard.removeAttribute('hidden');
        };

        const renderLinks = (links) => {
          if (!linksGrid || !linksCard) return;
          if (!Array.isArray(links) || links.length === 0) {
            linksGrid.innerHTML =
              '<p class="dashboard-empty">No links yet. Mint one from the self-serve flow.</p>';
            linksCard.removeAttribute('hidden');
            return;
          }

          linksGrid.innerHTML = '';
          linkRegistry.clear();

          for (const link of links) {
            const tierId = link?.tier ?? 'baseline';
            const tierLabel = typeof link?.tierLabel === 'string' ? link.tierLabel : tierId;
            const price =
              typeof link?.priceUsd === 'number' && link.priceUsd > 0
                ? formatUsd(link.priceUsd)
                : '$0.005 default';
            const stats = link?.stats ?? null;
            const usage = link?.usage ?? null;
            const paidTotal = Number(stats?.paidCallsTotal ?? usage?.totalPaidCalls ?? 0);
            const paid24h = stats?.paidCalls24h;
            const freeTotal = Number(stats?.freeCallsTotal ?? usage?.totalFreeCalls ?? 0);
            const free24h = stats?.freeCalls24h;
            const revenueTotal = Number(stats?.revenueUsdTotal ?? usage?.totalRevenueUsd ?? 0);
            const revenue24h = stats?.revenueUsd24h;
            const lastPaymentAt = stats?.lastPaymentAt ?? usage?.lastPaymentAt ?? null;
            const createdAt = formatDateTime(link?.createdAt ?? null);
            const linkUrl = link?.linkUrl ?? link?.origin ?? '#';

            if (link?.id) {
              linkRegistry.set(link.id, {
                url: linkUrl,
                origin: link?.origin ?? '',
              });
            }

            const article = document.createElement('article');
            article.className = 'dashboard-link-card';

            const header = document.createElement('header');
            const urlContainer = document.createElement('div');
            urlContainer.className = 'link-url';
            const anchor = document.createElement('a');
            anchor.href = linkUrl;
            anchor.target = '_blank';
            anchor.rel = 'noopener';
            anchor.textContent = linkUrl;
            urlContainer.append(anchor);

            const actions = document.createElement('div');
            actions.className = 'link-actions';
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.className = 'button secondary';
            copyButton.setAttribute('data-copy', linkUrl ?? '');
            copyButton.setAttribute('data-copy-label', 'Copy link');
            copyButton.setAttribute('data-copy-success', 'Copied!');
            copyButton.setAttribute('data-analytics-click', 'dashboard_copy_link');
            copyButton.textContent = 'Copy link';
            actions.append(copyButton);

            header.append(urlContainer, actions);
            article.append(header);

            const metaPrimary = document.createElement('div');
            metaPrimary.className = 'link-meta';
            const tierSpan = document.createElement('span');
            tierSpan.className = tierClass(tierId);
            tierSpan.textContent = tierLabel;
            metaPrimary.append(tierSpan);

            const priceSpan = document.createElement('span');
            priceSpan.textContent = 'Price: ' + price;
            metaPrimary.append(priceSpan);

            const paidSpan = document.createElement('span');
            paidSpan.textContent =
              'Paid calls: ' +
              formatNumber(paidTotal) +
              (typeof paid24h === 'number'
                ? ' (' + formatNumber(paid24h) + ' / 24h)'
                : '');
            metaPrimary.append(paidSpan);

            const freeSpan = document.createElement('span');
            freeSpan.textContent =
              'Free calls: ' +
              formatNumber(freeTotal) +
              (typeof free24h === 'number'
                ? ' (' + formatNumber(free24h) + ' / 24h)'
                : '');
            metaPrimary.append(freeSpan);

            const revenueSpan = document.createElement('span');
            revenueSpan.textContent =
              'Revenue: ' +
              formatUsd(revenueTotal) +
              (typeof revenue24h === 'number'
                ? ' (' + formatUsd(revenue24h) + ' / 24h)'
                : '');
            metaPrimary.append(revenueSpan);

            article.append(metaPrimary);

            const metaSecondary = document.createElement('div');
            metaSecondary.className = 'link-meta';
            const createdSpan = document.createElement('span');
            createdSpan.textContent = 'Created: ' + createdAt;
            metaSecondary.append(createdSpan);

            if (link?.origin) {
              const originSpan = document.createElement('span');
              originSpan.textContent = 'Origin: ' + link.origin;
              metaSecondary.append(originSpan);
            }

            if (link?.apiKeyPreview) {
              const previewSpan = document.createElement('span');
              previewSpan.textContent = 'Key preview: ' + link.apiKeyPreview;
              metaSecondary.append(previewSpan);
            }

            const lastPaymentSpan = document.createElement('span');
            lastPaymentSpan.textContent = 'Last payment: ' + formatDateTime(lastPaymentAt);
            metaSecondary.append(lastPaymentSpan);

            article.append(metaSecondary);
            linksGrid.append(article);
          }

          linksCard.removeAttribute('hidden');
        };

        const renderTrends = (points) => {
          if (!trendList || !trendCard) return;
          trendList.innerHTML = '';
          if (!Array.isArray(points) || points.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'dashboard-empty';
            empty.textContent = 'No traffic recorded yet.';
            trendList.append(empty);
            trendCard.removeAttribute('hidden');
            return;
          }

          const recent = points.slice(-7).reverse();
          for (const point of recent) {
            const paid = Number(point?.paidCalls ?? 0);
            const free = Number(point?.freeCalls ?? 0);
            const revenue = Number(point?.revenueUsd ?? 0);
            const total = paid + free;
            const item = document.createElement('li');
            item.className = 'dashboard-trend-item';

            const header = document.createElement('div');
            header.className = 'dashboard-trend-item__header';
            const dateLabel = document.createElement('span');
            dateLabel.textContent = formatDateLabel(point?.date ?? null);
            const totalLabel = document.createElement('span');
            totalLabel.textContent = formatNumber(total) + ' requests';
            header.append(dateLabel, totalLabel);
            item.append(header);

            const bar = document.createElement('div');
            bar.className = 'dashboard-trend-item__bar';
            if (total > 0) {
              const paidWidth = Math.max((paid / total) * 100, 0);
              const freeWidth = Math.max((free / total) * 100, 0);
              if (paid > 0) {
                const paidSegment = document.createElement('span');
                paidSegment.className =
                  'dashboard-trend-item__bar-segment dashboard-trend-item__bar-paid';
                paidSegment.style.width = paidWidth + '%';
                paidSegment.setAttribute('aria-label', formatNumber(paid) + ' paid calls');
                bar.append(paidSegment);
              }
              if (free > 0) {
                const freeSegment = document.createElement('span');
                freeSegment.className =
                  'dashboard-trend-item__bar-segment dashboard-trend-item__bar-free';
                freeSegment.style.width = freeWidth + '%';
                freeSegment.setAttribute('aria-label', formatNumber(free) + ' free calls');
                bar.append(freeSegment);
              }
              if (paid === 0 && free === 0) {
                const zeroSegment = document.createElement('span');
                zeroSegment.className =
                  'dashboard-trend-item__bar-segment dashboard-trend-item__bar-paid';
                zeroSegment.style.width = '0%';
                bar.append(zeroSegment);
              }
            } else {
              const zeroSegment = document.createElement('span');
              zeroSegment.className =
                'dashboard-trend-item__bar-segment dashboard-trend-item__bar-paid';
              zeroSegment.style.width = '0%';
              bar.append(zeroSegment);
            }
            item.append(bar);

            const meta = document.createElement('div');
            meta.className = 'dashboard-trend-item__meta';
            meta.textContent =
              'Paid ' +
              formatNumber(paid) +
              ' · Free ' +
              formatNumber(free) +
              ' · Revenue ' +
              formatUsd(revenue);
            item.append(meta);

            trendList.append(item);
          }

          trendCard.removeAttribute('hidden');
        };

        const renderReferrers = (referrers) => {
          if (!referrersList || !referrersCard) return;
          referrersList.innerHTML = '';
          if (!Array.isArray(referrers) || referrers.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'dashboard-empty';
            empty.textContent = 'No referrers recorded in the last 24 hours.';
            referrersList.append(empty);
            referrersCard.removeAttribute('hidden');
            return;
          }

          const top = referrers.slice(0, 5);
          for (const stat of top) {
            const item = document.createElement('li');
            item.className = 'dashboard-referrers__item';
            const host = document.createElement('span');
            host.className = 'dashboard-referrers__host';
            const hostValue = (stat?.host ?? '').trim();
            host.textContent = hostValue && hostValue !== 'direct' ? hostValue : 'Direct / unknown';

            const count = document.createElement('span');
            count.className = 'dashboard-referrers__count';
            count.textContent = formatNumber(stat?.paidCalls24h ?? 0) + ' paid';

            item.append(host, count);
            referrersList.append(item);
          }

          referrersCard.removeAttribute('hidden');
        };

        const renderActivity = (entries) => {
          if (!activityList || !activityCard) return;
          activityList.innerHTML = '';
          if (!Array.isArray(entries) || entries.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'dashboard-empty';
            empty.textContent = 'No recent payment activity logged yet.';
            activityList.append(empty);
            activityCard.removeAttribute('hidden');
            return;
          }

          const recent = entries.slice(0, 10);
          for (const entry of recent) {
            const item = document.createElement('div');
            item.className = 'dashboard-activity__item';

            const header = document.createElement('div');
            header.className = 'dashboard-activity__header';
            const value = document.createElement('span');
            value.className = 'dashboard-activity__value';
            if (entry?.type === 'paid') {
              value.textContent = 'Paid ' + formatUsd(entry?.priceUsd ?? 0);
            } else {
              value.textContent = 'Free access';
            }
            header.append(value);

            if (entry?.occurredAt) {
              const timeEl = document.createElement('time');
              timeEl.className = 'dashboard-activity__time';
              timeEl.dateTime = entry.occurredAt;
              timeEl.textContent = formatDateTime(entry.occurredAt);
              header.append(timeEl);
            }

            item.append(header);

            const meta = document.createElement('div');
            meta.className = 'dashboard-activity__meta';

            if (entry?.linkId) {
              const linkInfo = linkRegistry.get(entry.linkId);
              const linkMeta = document.createElement('span');
              linkMeta.className = 'dashboard-activity__meta-item';
              linkMeta.textContent = 'Link: ';
              if (linkInfo?.url) {
                const linkAnchor = document.createElement('a');
                linkAnchor.href = linkInfo.url;
                linkAnchor.target = '_blank';
                linkAnchor.rel = 'noopener';
                linkAnchor.textContent = linkInfo.url;
                linkMeta.append(linkAnchor);
              } else {
                linkMeta.textContent += entry.linkId.slice(0, 8) + '…';
              }
              meta.append(linkMeta);
            }

            if (entry?.referrerHost) {
              const ref = document.createElement('span');
              ref.className = 'dashboard-activity__meta-item';
              const hostValue = (entry.referrerHost ?? '').trim();
              ref.textContent =
                'Referrer: ' + (hostValue && hostValue !== 'direct' ? hostValue : 'Direct / unknown');
              meta.append(ref);
            }

            if (entry?.reason) {
              const reason = document.createElement('span');
              reason.className = 'dashboard-activity__meta-item';
              reason.textContent = 'Reason: ' + entry.reason;
              meta.append(reason);
            }

            if (entry?.discountApplied) {
              const discount = document.createElement('span');
              discount.className = 'dashboard-activity__meta-item';
              discount.textContent = 'Discount applied';
              meta.append(discount);
            }

            if (entry?.freeQuotaUsed) {
              const quota = document.createElement('span');
              quota.className = 'dashboard-activity__meta-item';
              quota.textContent = 'Counted toward free quota';
              meta.append(quota);
            }

            item.append(meta);
            activityList.append(item);
          }

          activityCard.removeAttribute('hidden');
        };

        const renderWebhooksError = (message) => {
          if (!webhooksBody || !webhooksCard) return;
          webhooksBody.innerHTML = '<p class="dashboard-empty">' + escapeHtml(message) + '</p>';
          webhooksCard.removeAttribute('hidden');
        };

        const renderWebhooks = (payload) => {
          if (!webhooksBody || !webhooksCard) return;

          if (!payload || payload.featureAvailable === false) {
            webhooksBody.innerHTML =
              '<p class="dashboard-empty">Webhooks activate with the Premium tier. Reach out if you want early access.</p>';
            webhooksCard.removeAttribute('hidden');
            if (webhooksUpdated) {
              webhooksUpdated.setAttribute('hidden', 'true');
            }
            return;
          }

          const summary = payload.summary ?? {};
          const success24h = Number(summary.success24h ?? 0);
          const failure24h = Number(summary.failure24h ?? 0);
          let failurePercent =
            typeof summary.failurePercent24h === 'number'
              ? summary.failurePercent24h
              : Number(summary.failureRate24h ?? 0) * 100;
          if (!Number.isFinite(failurePercent)) {
            failurePercent = 0;
          }
          const failurePercentLabel = (Math.round(failurePercent * 10) / 10).toFixed(1).replace(/\.0$/, '') + '%';

          webhooksBody.innerHTML = '';

          const summaryBlock = document.createElement('div');
          summaryBlock.className = 'dashboard-webhooks__summary';

          const makeSummaryItem = (label, value, hint, variant = 'default') => {
            const item = document.createElement('div');
            item.className = 'dashboard-webhooks__summary-item dashboard-webhooks__summary-item--' + variant;
            const labelEl = document.createElement('span');
            labelEl.className = 'dashboard-webhooks__summary-label';
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'dashboard-webhooks__summary-value';
            valueEl.textContent = value;
            const hintEl = document.createElement('span');
            hintEl.className = 'dashboard-webhooks__summary-hint';
            hintEl.textContent = hint;
            item.append(labelEl, valueEl, hintEl);
            return item;
          };

          summaryBlock.append(
            makeSummaryItem(
              'Delivered (24h)',
              formatNumber(success24h),
              'Last success ' + formatDateTime(summary.lastSuccessAt ?? null),
              'success'
            ),
            makeSummaryItem(
              'Failed (24h)',
              formatNumber(failure24h),
              summary.lastFailureAt ? 'Last failure ' + formatDateTime(summary.lastFailureAt) : 'No failures logged',
              failure24h > 0 ? 'danger' : 'default'
            ),
            makeSummaryItem('Failure rate', failurePercentLabel, '24h rolling failure share')
          );

          const listHeading = document.createElement('h3');
          listHeading.className = 'dashboard-webhooks__heading';
          listHeading.textContent = 'Recent deliveries';

          const list = document.createElement('ul');
          list.className = 'dashboard-webhooks__list';

          const deliveries = Array.isArray(payload.recentDeliveries) ? payload.recentDeliveries : [];
          if (deliveries.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'dashboard-empty';
            empty.textContent = 'No webhook deliveries recorded yet.';
            list.append(empty);
          } else {
            for (const delivery of deliveries) {
              const item = document.createElement('li');
              item.className = 'dashboard-webhooks__item';

              const header = document.createElement('div');
              header.className = 'dashboard-webhooks__item-head';

              const badge = document.createElement('span');
              badge.className =
                'dashboard-pill '
                + (delivery?.status === 'success' ? 'dashboard-pill--success' : 'dashboard-pill--danger');
              badge.textContent = delivery?.status === 'success' ? 'Delivered' : 'Failed';
              header.append(badge);

              const time = document.createElement('span');
              time.className = 'dashboard-webhooks__item-time';
              time.textContent = formatDateTime(delivery?.occurredAt ?? null);
              header.append(time);

              item.append(header);

              const meta = document.createElement('div');
              meta.className = 'dashboard-webhooks__meta';

              if (delivery?.linkId) {
                const linkInfo = linkRegistry.get(delivery.linkId);
                const linkSpan = document.createElement('span');
                linkSpan.className = 'dashboard-webhooks__meta-item';
                linkSpan.textContent = 'Link: ';
                if (linkInfo?.url) {
                  const anchor = document.createElement('a');
                  anchor.href = linkInfo.url;
                  anchor.target = '_blank';
                  anchor.rel = 'noopener';
                  anchor.textContent = linkInfo.url;
                  linkSpan.appendChild(anchor);
                } else {
                  const code = document.createElement('code');
                  code.textContent = delivery.linkId;
                  linkSpan.appendChild(code);
                }
                meta.append(linkSpan);
              }

              if (delivery?.webhookUrl) {
                let host = delivery.webhookUrl;
                try {
                  const parsed = new URL(delivery.webhookUrl);
                  host = parsed.host || parsed.hostname || delivery.webhookUrl;
                } catch {
                  /* ignore */
                }
                const endpoint = document.createElement('span');
                endpoint.className = 'dashboard-webhooks__meta-item';
                endpoint.textContent = 'Endpoint: ' + host;
                meta.append(endpoint);
              }

              if (typeof delivery?.responseStatus === 'number') {
                const status = document.createElement('span');
                status.className = 'dashboard-webhooks__meta-item';
                status.textContent = 'Response: ' + delivery.responseStatus;
                meta.append(status);
              }

              if (typeof delivery?.latencyMs === 'number') {
                const latency = document.createElement('span');
                latency.className = 'dashboard-webhooks__meta-item';
                latency.textContent = 'Latency: ' + formatNumber(delivery.latencyMs) + ' ms';
                meta.append(latency);
              }

              if (typeof delivery?.attempts === 'number' && delivery.attempts > 1) {
                const attempts = document.createElement('span');
                attempts.className = 'dashboard-webhooks__meta-item';
                attempts.textContent = 'Attempts: ' + formatNumber(delivery.attempts);
                meta.append(attempts);
              }

              if (delivery?.errorMessage) {
                const errorEl = document.createElement('p');
                errorEl.className = 'dashboard-webhooks__error';
                errorEl.textContent = 'Error: ' + delivery.errorMessage;
                meta.append(errorEl);
              }

              if (meta.childNodes.length > 0) {
                item.append(meta);
              }

              list.append(item);
            }
          }

          webhooksBody.append(summaryBlock, listHeading, list);
          webhooksCard.removeAttribute('hidden');
        };

        const loadBalance = async (key, { fresh = false } = {}) => {
          if (!key || !balanceBody) return;
          try {
            if (balanceRefreshButton) {
              balanceRefreshButton.setAttribute('disabled', 'true');
            }
            const response = await fetch('/dashboard/balance' + (fresh ? '?fresh=1' : ''), {
              headers: {
                authorization: 'Bearer ' + key,
              },
            });

            if (!response.ok) {
              throw new Error('HTTP ' + response.status);
            }

            const payload = await response.json();
            renderBalance(payload);
          } catch (error) {
            console.warn('dashboard balance error', error);
            if (balanceBody) {
              balanceBody.innerHTML =
                '<p class="dashboard-empty">Unable to load balance. Try again shortly.</p>';
            }
          } finally {
            if (balanceRefreshButton) {
              balanceRefreshButton.removeAttribute('disabled');
            }
          }
        };

        const loadWebhooks = async (key, { silent = false } = {}) => {
          if (!key || webhooksLoading) return;
          webhooksLoading = true;

          const showHint = (message, variant) => {
            if (!webhooksUpdated) return;
            webhooksUpdated.textContent = message;
            webhooksUpdated.setAttribute('data-variant', variant);
            webhooksUpdated.removeAttribute('hidden');
          };

          const hideHint = () => {
            if (!webhooksUpdated) return;
            webhooksUpdated.textContent = '';
            webhooksUpdated.setAttribute('hidden', 'true');
          };

          try {
            if (!silent && webhooksUpdated) {
              showHint('Loading webhook deliveries…', 'info');
            }

            const response = await fetch('/dashboard/webhooks', {
              headers: {
                authorization: 'Bearer ' + key,
              },
            });

            if (response.status === 401 || response.status === 403) {
              hideHint();
              setStatus('Your session expired. Paste your Sol402 API key to continue.', 'error');
              resetKey();
              return;
            }

            if (response.status === 502) {
              renderWebhooksError('Webhook analytics temporarily unavailable.');
              showHint('Webhook analytics temporarily unavailable.', 'error');
              return;
            }

            if (!response.ok) {
              throw new Error('HTTP ' + response.status);
            }

            const payload = await response.json();
            renderWebhooks(payload);

            if (payload?.featureAvailable) {
              const stamp = formatUpdatedAt(payload?.generatedAt ?? null);
              showHint(
                stamp ? 'Webhooks refreshed ' + stamp : 'Webhooks refreshed just now',
                'success'
              );
            } else {
              hideHint();
            }
          } catch (error) {
            console.warn('dashboard webhooks error', error);
            renderWebhooksError('Unable to load webhook deliveries right now.');
            showHint('Unable to load webhook deliveries right now.', 'error');
          } finally {
            webhooksLoading = false;
          }
        };

        const loadMetrics = async (key, { silent = false } = {}) => {
          if (!key || metricsLoading) return;
          metricsLoading = true;
          setUpdated(silent ? 'Refreshing analytics…' : 'Loading analytics…', 'info');

          try {
            const response = await fetch('/dashboard/metrics', {
              headers: {
                authorization: 'Bearer ' + key,
              },
            });

            if (response.status === 503) {
              resetAnalyticsSections();
              setUpdated('Analytics not configured for this deployment.', 'error');
              return;
            }

            if (response.status === 401 || response.status === 403) {
              setStatus('Your session expired. Paste your Sol402 API key to continue.', 'error');
              resetKey();
              return;
            }

            if (!response.ok) {
              throw new Error('HTTP ' + response.status);
            }

            const payload = await response.json();
            const summary = {
              totalPaidCalls: payload?.summary?.paidCallsTotal ?? 0,
              paidCalls24h: payload?.summary?.paidCalls24h ?? 0,
              totalFreeCalls: payload?.summary?.freeCallsTotal ?? 0,
              freeCalls24h: payload?.summary?.freeCalls24h ?? 0,
              totalRevenueUsd: payload?.summary?.revenueUsdTotal ?? 0,
              revenueUsd24h: payload?.summary?.revenueUsd24h ?? 0,
              lastPaymentAt: payload?.summary?.lastPaymentAt ?? null,
              freeCallsDailyLimit: payload?.summary?.freeCallsDailyLimit ?? null,
              freeCallsRemaining: payload?.summary?.freeCallsRemaining ?? null,
            };

            renderStats(summary);

            if (Array.isArray(payload?.links)) {
              renderLinks(payload.links);
            }

            renderTrends(payload?.timeseries ?? []);
            renderReferrers(payload?.topReferrers ?? []);
            renderActivity(payload?.recentActivity ?? []);

            const stamped = formatUpdatedAt(payload?.generatedAt ?? null);
            setUpdated(
              stamped ? 'Analytics refreshed ' + stamped : 'Analytics refreshed just now'
            );
          } catch (error) {
            console.warn('dashboard metrics error', error);
            setUpdated('Unable to load analytics right now.', 'error');
            if (!silent) {
              setStatus('Usage analytics are temporarily unavailable.', 'error');
            }
          } finally {
            metricsLoading = false;
            if (currentKey === key) {
              loadWebhooks(key, { silent: true });
            }
          }
        };

        const persistKey = (key) => {
          currentKey = key;
          try {
            localStorage.setItem(storageKey, key);
          } catch {
            /* storage disabled */
          }
        };

        const resetKey = (message) => {
          currentKey = null;
          try {
            localStorage.removeItem(storageKey);
          } catch {
            /* noop */
          }
          if (apiKeyInput) {
            apiKeyInput.value = '';
          }
          showControls(false);
          clearContent();
          if (message) {
            setStatus(message, 'info');
          } else {
            setStatus('', 'info');
          }
        };

        const handleSuccess = (payload, key, { silent } = {}) => {
          if (!payload || typeof payload !== 'object') {
            setStatus('Unexpected response from the dashboard.', 'error');
            return;
          }
          persistKey(key);
          renderSummary(payload);
          loadBalance(key, { fresh: false }).catch((error) => {
            console.warn('dashboard balance bootstrap error', error);
          });
          renderStats(payload.stats || {});
          renderLinks(payload.links || []);
          showControls(true);
          loadMetrics(key, { silent: Boolean(silent) });
          if (!silent) {
            setStatus('Dashboard loaded.', 'success');
          } else {
            setStatus('', 'info');
          }
          track('dashboard_loaded', {
            tier: payload?.tier?.id ?? null,
            linkCount: Array.isArray(payload?.links) ? payload.links.length : 0,
          });
        };

        const requestDashboard = async (
          key,
          { endpoint = '/dashboard/links', method = 'GET', silent = false } = {}
        ) => {
          if (!key) {
            setStatus('Enter your Sol402 API key to continue.', 'error');
            return;
          }
          if (isLoading) return;
          setLoading(true);
          if (!silent) {
            setStatus(method === 'POST' ? 'Authenticating…' : 'Refreshing dashboard…', 'info');
          }
          try {
            const response = await fetch(endpoint, {
              method,
              headers:
                method === 'POST'
                  ? {
                      'content-type': 'application/json',
                    }
                  : {
                      authorization: 'Bearer ' + key,
                    },
              body: method === 'POST' ? JSON.stringify({ apiKey: key }) : undefined,
            });

            let payload = null;
            try {
              payload = await response.json();
            } catch {
              payload = null;
            }

            if (!response.ok) {
              const message =
                (payload && typeof payload.message === 'string'
                  ? payload.message
                  : 'Unable to load the dashboard. Double-check your key and try again.') ??
                'Unable to load the dashboard.';
              if (response.status === 401 || response.status === 403) {
                resetKey(message);
              } else {
                setStatus(message, 'error');
              }
              return;
            }

            handleSuccess(payload, key, { silent });
          } catch (error) {
            console.error('Dashboard request failed', error);
            setStatus('Network error. Please retry in a moment.', 'error');
          } finally {
            setLoading(false);
          }
        };

        if (form) {
          form.addEventListener('submit', (event) => {
            event.preventDefault();
            const key = apiKeyInput?.value?.trim();
            if (!key) {
              setStatus('Enter your Sol402 API key to continue.', 'error');
              return;
            }
            requestDashboard(key, { endpoint: '/dashboard/session', method: 'POST', silent: false });
          });
        }

        refreshButton?.addEventListener('click', () => {
          if (!currentKey) {
            setStatus('Paste your Sol402 API key first.', 'error');
            return;
          }
          requestDashboard(currentKey, { endpoint: '/dashboard/links', method: 'GET', silent: false });
        });

        clearButton?.addEventListener('click', () => {
          resetKey('API key cleared from this browser.');
        });

        let processedViaQuery = false;
        try {
          const url = new URL(window.location.href);
          const paramKey = url.searchParams.get('key');
          if (paramKey && paramKey.trim()) {
            const trimmed = paramKey.trim();
            try {
              localStorage.setItem(storageKey, trimmed);
            } catch {
              /* storage unavailable */
            }
            currentKey = trimmed;
            if (apiKeyInput) {
              apiKeyInput.value = trimmed;
            }
            showControls(true);
            loadBalance(trimmed, { fresh: true });
            requestDashboard(trimmed, { endpoint: '/dashboard/links', method: 'GET', silent: false });
            processedViaQuery = true;
            url.searchParams.delete('key');
            history.replaceState?.(null, '', url.pathname + (url.hash || ''));
          }
        } catch (error) {
          console.warn('dashboard query param processing failed', error);
        }

        if (!processedViaQuery) {
          try {
            const savedKey = localStorage.getItem(storageKey);
            if (savedKey) {
              currentKey = savedKey;
              if (apiKeyInput) {
                apiKeyInput.value = savedKey;
              }
              showControls(true);
              loadBalance(savedKey, { fresh: false });
              requestDashboard(savedKey, { endpoint: '/dashboard/links', method: 'GET', silent: true });
            }
          } catch {
            /* storage unavailable */
          }
        }

        balanceRefreshButton?.addEventListener('click', () => {
          if (!currentKey) {
            setStatus('Paste your Sol402 API key first.', 'error');
            return;
          }
          loadBalance(currentKey, { fresh: true });
        });
      </script>`,
  });

const renderPricing: RenderFn = () =>
  renderPage({
    title: 'Pricing — pay-per-request built for agents',
    description:
      'Only pay when your paywall earns. Base price $0.005 per request with SOL402 discounts and free quota tiers.',
    path: '/pricing',
    analyticsEvent: 'view_pricing',
    content: html`${pricingHero}${pricingCalculator}${pricingTiers}${pricingFaq}${pricingContact}`,
  });


const tokenHero = html`<section class="section section--token">
  <div class="section__header" data-animate="fade-up">
    ${brandBadge('section', { decorative: true })}
    <h2>Make SOL402 work for you</h2>
    <p class="section__subhead">
      Token holders unlock instant onboarding, discounts, and roadmap perks. Contract:
      <code class="token-ca">HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump</code>
    </p>
  </div>
  <div class="tier-grid">
    <article class="tier-card tier-card--baseline" data-animate="fade-up">
      <header>
        <span class="pill pill--baseline">Baseline · ≥1M SOL402</span>
      </header>
      <ul>
        <li>Instant onboarding &amp; admin key minting</li>
        <li>Up to 3 links, 200 paid calls/day</li>
        <li>5 free calls per wallet daily</li>
      </ul>
    </article>
    <article class="tier-card tier-card--growth" data-animate="fade-up" data-animate-delay="100">
      <header>
        <span class="pill pill--growth">Growth · ≥2M SOL402</span>
      </header>
      <ul>
        <li>25% discount on every paid call</li>
        <li>10 concurrent links, 500 paid calls/day</li>
        <li>Priority RPC and retry lanes</li>
      </ul>
    </article>
    <article class="tier-card tier-card--premium" data-animate="fade-up" data-animate-delay="200">
      <header>
        <span class="pill pill--premium">Premium · ≥5M SOL402</span>
      </header>
      <ul>
        <li>2,000 paid calls/day &amp; 20 active links</li>
        <li>Webhooks, ClickHouse sync, revenue reports</li>
        <li>Early access to custodial payouts &amp; UI pricing tweaks</li>
      </ul>
    </article>
  </div>
</section>`;

const tokenUtility = html`<section class="section section--features">
  <div class="section__header" data-animate="fade-up">
    <h2>Utility now, not promises</h2>
    <p class="section__subhead">
      The moment your wallet holds SOL402, we fast-track onboarding, unlock quotas, and apply discounts
      across every paywalled endpoint you run.
    </p>
  </div>
  <div class="feature-grid">
    <article class="feature-card" data-animate="fade-up">
      <h3>Automation on day one</h3>
      <p>Connect once and mint scoped credentials with no human review.</p>
      <ul>
        <li>Instant wallet verification &amp; admin key minting</li>
        <li>3 live links, 200 paid calls/day, 5 free calls/day</li>
      </ul>
    </article>
    <article class="feature-card" data-animate="fade-up" data-animate-delay="100">
      <h3>Discounts + throughput</h3>
      <p>Hold ≥2M tokens to trigger the 25% discount and higher rate limits.</p>
      <ul>
        <li>10 live links, 500 paid calls/day</li>
        <li>Priority RPC retries + enhanced rate limits</li>
      </ul>
    </article>
    <article class="feature-card" data-animate="fade-up" data-animate-delay="200">
      <h3>Premium automation</h3>
      <p>Operate at scale with direct analytics exports and automation hooks.</p>
      <ul>
        <li>20 live links, 2,000 paid calls/day</li>
        <li>Webhooks, ClickHouse sync, revenue reports (beta)</li>
      </ul>
    </article>
  </div>
</section>`;

const tokenCta = html`<section class="token-cta">
  <div class="token-cta__content">
    <h2>Hold SOL402, ship paywalls faster</h2>
    <p>Grab SOL402, connect your wallet, and start monetizing requests today.</p>
  </div>
  <div class="token-cta__actions">
    <a
      class="button primary"
      href="https://pump.fun/coin/HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump"
      target="_blank"" rel="noreferrer">
      Buy SOL402
    </a>
    <a class="button secondary" href="/link/request">Launch the builder</a>
  </div>
</section>`;

const renderToken: RenderFn = () =>
  renderPage({
    title: 'SOL402 utility & roadmap',
    description:
      'The SOL402 token powers instant onboarding, free call quotas, and discounted pricing across Sol402 paywalls.',
    ogTitle: 'SOL402 token utility',
    ogDescription: 'Unlock instant onboarding, discounts, and analytics perks by holding SOL402.',
    path: '/token',
    analyticsEvent: 'view_token',
    content: html`${tokenHero}${tokenUtility}${tokenCta}`,
  });


const renderLinkRequest: RenderFn = () =>
  renderPage({
    title: 'Request a paywalled link',
    description:
      'Connect your wallet, configure pricing, and mint a Sol402 paywall link instantly when you hold enough SOL402.',
    path: '/link/request',
    analyticsEvent: 'view_link_request',
    content: html`${linkHero}${linkBuilderSection}${linkBuilderFaq}${linkBuilderSupport}`,
  });

const renderQuickstart: RenderFn = () =>
  renderPage({
    title: 'Quickstart — x402 in 5 minutes',
    description:
      'Create a paywalled link, integrate the HTTP 402 challenge, and observe analytics with the Sol402 stack.',
    path: '/docs/quickstart',
    analyticsEvent: 'view_docs',
    content: html`${docsHero}${docsSteps}${docsResources}${docsFaq}`,
  });

const renderDemo: RenderFn = () =>
  renderPage({
    title: 'Live Demo — Sol402',
    description: 'Run an end-to-end x402 payment with Phantom and Sol402.',
    path: '/demo',
    analyticsEvent: 'view_demo',
    content: html`<section class="hero">
        <h1>Live Demo</h1>
        <p class="subhead">
          Connect a Phantom wallet, approve a $0.005 USDC payment via PayAI, and watch the proxied JSON
          stream back instantly.
        </p>
        <div class="cta-row">
          <a class="button primary" href="/link/request" data-analytics-click="demo_create_link">
            Create your own link
          </a>
          <a class="button secondary" href="/docs/quickstart" data-analytics-click="demo_read_docs">
            Implementation guide
          </a>
        </div>
      </section>
      <section class="card demo-card">
        <div class="demo-grid">
          <div>
            <h2>Try it now</h2>
            <ol class="demo-steps">
              <li>Install the Phantom browser extension (desktop).</li>
              <li>Connect a wallet funded with a little USDC + SOL for fees.</li>
              <li>Click “Pay &amp; fetch” to approve the 402 payment and view the JSON payload.</li>
            </ol>
            <p class="demo-note">
              This hits <code>https://sol402.app/p/a11a560a-d530-4dee-88da-4783862e0d33</code> and charges
              0.005&nbsp;USDC on Solana mainnet.
            </p>
            <div class="demo-controls">
              <button id="sol402-demo-connect" class="button secondary">Connect Phantom</button>
              <button id="sol402-demo-pay" class="button primary" disabled>Pay &amp; fetch</button>
            </div>
          </div>
          <div>
            <h3>Status</h3>
            <pre id="sol402-demo-log" class="demo-log">Ready. Connect Phantom to begin.</pre>
            <h3>Response</h3>
            <pre id="sol402-demo-result" class="demo-result demo-result--muted">No response yet.</pre>
          </div>
        </div>
      </section>
      <section class="card demo-faq">
        <h2>Troubleshooting</h2>
        <ul>
          <li>We currently support Phantom on desktop. Mobile wallets are coming soon.</li>
          <li>Need funds? Swap a little USDC and SOL into your Phantom wallet before running the demo.</li>
          <li>
            Every request streams analytics to ClickHouse and logs to Grafana—perfect for observing real usage.
          </li>
        </ul>
      </section>
      <script>
        window.sol402DemoConfig = {
          demoUrl: 'https://sol402.app/p/a11a560a-d530-4dee-88da-4783862e0d33',
          rpcUrl: '/demo/rpc',
          fallbackRpcUrl: 'https://solana-mainnet.rpc.extrnode.com/b25026fe-8bd3-4f49-beba-64e75db8deb6',
          network: 'solana',
        };
      </script>
      <script type="module" src="/assets/sol402-demo.js"></script>`,
  });

const renderFaq: RenderFn = () =>
  renderPage({
    title: 'Frequently Asked Questions — Sol402',
    description: 'Answers about x402, Solana USDC support, and pay-per-request flows.',
    path: '/faq',
    analyticsEvent: 'view_faq',
    content: html`<section class="hero">
        <h1>Frequently asked questions</h1>
      </section>
      <section class="card">
        <dl class="questions">
          <dt>What is x402?</dt>
          <dd>A standard way to do payments over HTTP 402 Payment Required.</dd>
          <dt>Which chain/tokens are supported?</dt>
          <dd>We support USDC on Solana first; more networks may follow.</dd>
          <dt>Do I need an account or API key?</dt>
          <dd>No. It’s pay-per-request via HTTP.</dd>
          <dt>Can humans use it?</dt>
          <dd>Yes—via wallets and facilitator UIs. Agents can pay automatically.</dd>
          <dt>Is content cached?</dt>
          <dd>By default we proxy 1:1. You can set Cache-Control via your origin.</dd>
          <dt>Are there refunds?</dt>
          <dd>Payments settle on-chain. Treat each access as final.</dd>
          <dt>What content is allowed?</dt>
          <dd>Only legal content you have rights to share. We block abusive links.</dd>
        </dl>
      </section>`,
  });

const renderTerms: RenderFn = () =>
  renderPage({
    title: 'Terms — Sol402',
    description: 'Usage terms for Sol402 pay-per-request services.',
    path: '/legal/terms',
    analyticsEvent: 'view_terms',
    content: html`<section class="hero">
        <h1>Terms</h1>
      </section>
      <section class="card">
        <p>
          You may not proxy illegal, infringing, or harmful content. All payments are final once
          settled on-chain. We reserve the right to disable abusive links.
        </p>
      </section>`,
  });

const renderPrivacy: RenderFn = () =>
  renderPage({
    title: 'Privacy — Sol402',
    description: 'Privacy statement for Sol402 pay-per-request infrastructure.',
    path: '/legal/privacy',
    analyticsEvent: 'view_privacy',
    content: html`<section class="hero">
        <h1>Privacy</h1>
      </section>
      <section class="card">
        <p>
          We log minimal metadata to operate the service (timestamps, linkId, status codes). We do not
          sell personal data.
        </p>
      </section>`,
  });

const renderChangelog: RenderFn = () =>
  renderPage({
    title: 'Changelog — Sol402',
    description: 'Product updates and launch notes for Sol402.',
    path: '/changelog',
    analyticsEvent: 'view_changelog',
    content: html`<section class="hero">
        <h1>Changelog</h1>
      </section>
      <section class="card">
        <h2>Self-serve dashboard</h2>
        <ul>
          <li>Added <a href="/dashboard">/dashboard</a> with scoped API key login and browser-only storage.</li>
          <li>Surfaced lifetime usage (paid/free calls, revenue, last settlement) per link.</li>
          <li>Tier summary, quota reminders, and copy helpers for every live \`/p/\` endpoint.</li>
        </ul>
      </section>
      <section class="card">
        <h2>Public beta launch</h2>
        <p>
          Shipping Sol402 — x402 paywalls for links &amp; APIs (USDC on Solana). Paste a URL, set a price,
          share the paywalled link. Docs/App: &lt;links&gt;
        </p>
      </section>`,
  });

const renderStatus: RenderFn = () =>
  renderPage({
    title: 'Status — Sol402',
    description: 'Service availability updates for Sol402.',
    path: '/status',
    analyticsEvent: 'view_status',
    content: html`<section class="hero">
        <h1>Status</h1>
        <p class="subhead">
          Status page integration is coming soon. For live updates email <a href="mailto:admin@sol402.app">
            admin@sol402.app
          </a>.
        </p>
      </section>`,
  });

export const siteRoutes: Array<{ path: string; render: RenderFn }> = [
  { path: '/', render: renderHome },
  { path: '/api', render: renderApi },
  { path: '/link/request', render: renderLinkRequest },
  { path: '/dashboard', render: renderDashboard },
  { path: '/pricing', render: renderPricing },
  { path: '/docs/quickstart', render: renderQuickstart },
  { path: '/token', render: renderToken },
  { path: '/demo', render: renderDemo },
  { path: '/faq', render: renderFaq },
  { path: '/legal/terms', render: renderTerms },
  { path: '/legal/privacy', render: renderPrivacy },
  { path: '/changelog', render: renderChangelog },
  { path: '/status', render: renderStatus },
];
