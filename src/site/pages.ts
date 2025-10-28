import { html } from 'hono/html';
import { renderPage } from './layout.js';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type RenderFn = () => ReturnType<typeof renderPage>;

const CREATE_LINK_CURL = `curl -X POST https://sol402.app/admin/links \\
  -H "X-Admin-Key: $ADMIN_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"origin":"https://example.com/my.pdf","priceUsd":0.01}'`;

const homeHero = html`<section class="hero">
  <span class="eyebrow">Sol402 Proxy</span>
  <h1>Pay-per-request for anything on the web</h1>
  <p class="subhead">
    Add a 402 Payment Required challenge to any URL or API. Get paid in USDC on Solana.
    No accounts, no keys—just HTTP.
  </p>
  <div class="cta-row">
    <a class="button primary" href="/link" data-analytics-click="click_create_link">
      Create a paywalled link
    </a>
    <a class="button secondary" href="/docs/quickstart" data-analytics-click="view_docs">
      Read the docs
    </a>
  </div>
  <div class="trust-bar">x402-native • Solana USDC • Agent-ready</div>
</section>`;

const homeValueProps = html`<section>
  <h2>Why teams choose Sol402</h2>
  <ul>
    <li>x402-native: Standard 402 → pay → retry flow.</li>
    <li>Solana-fast: Low fees, instant settlement in USDC-SPL.</li>
    <li>Frictionless: Works with bots, agents, or browsers.</li>
  </ul>
</section>`;

const homeHowItWorks = html`<section>
  <h2>How it works</h2>
  <ol>
    <li>You add a source: paste a URL or pick an endpoint.</li>
    <li>We answer requests with 402 + PaymentRequirements.</li>
    <li>After payment, we proxy the origin response 1:1.</li>
  </ol>
</section>`;

const homeCode = html`<section>
  <h2>Try the flow</h2>
  <pre><code>${escapeHtml(`# Request a paid endpoint

curl -i https://sol402.app/p/abc123

# → HTTP/1.1 402 Payment Required

# {
#   "x402Version": 1,
#   "accepts": [{
#     "scheme": "exact",
#     "network": "solana",
#     "asset": "<USDC_MINT>",
#     "payTo": "<MERCHANT_ADDRESS>",
#     "maxAmountRequired": "5000", # 0.005 USDC with 6 decimals
#     "maxTimeoutSeconds": 60
#   }]
# }

# After paying, retry with your payment header

curl -H "X-PAYMENT: <base64-payload>" https://sol402.app/p/abc123

# → 200 OK + X-PAYMENT-RESPONSE
`)}</code></pre>
</section>`;

const homeClosing = html`<section class="grid-2">
  <div class="card">
    <h2>Token perks</h2>
    <p>Hold ≥1M SOL402 for 5 free calls/day. Stack ≥2M to unlock a 25% discount.</p>
    <p class="disclaimer">Token CA: HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump.</p>
  </div>
  <div class="card">
    <h2>Pricing</h2>
    <p>Starts at $0.005 per request. No monthly fees.</p>
    <p class="disclaimer">
      Sol402 provides infrastructure only. Do not proxy illegal or infringing content. Token has
      utility only and no expectation of profit.
    </p>
  </div>
</section>`;

const renderHome: RenderFn = () =>
  renderPage({
    title: 'Sol402 — Turn any URL or API into a pay-per-request endpoint',
    description:
      'Drop-in paywalls for the agent economy. x402-native payments using USDC on Solana. No accounts, no API keys—just HTTP 402.',
    ogTitle: 'Pay-per-request for anything on the web',
    ogDescription: 'x402-native payments. USDC on Solana. Ship in minutes.',
    path: '/',
    analyticsEvent: 'view_home',
    content: html`${homeHero}${homeValueProps}${homeHowItWorks}${homeCode}${homeClosing}`,
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
          <a class="button secondary" href="/link" data-analytics-click="click_create_link">
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

const renderLink: RenderFn = () =>
  renderPage({
    title: 'Paywall any link — files, pages, downloads',
    description: 'Paste a link, set a price, share the paywalled URL. Get paid in USDC on Solana.',
    ogTitle: 'Paywall your link in one click',
    ogDescription: 'Share premium links and get paid per view with x402.',
    path: '/link',
    analyticsEvent: 'view_link',
    content: html`<section class="hero">
        <h1>Paywall any link</h1>
        <p class="subhead">
          Paste a URL, set a price, get a /p/ short link. Visitors pay a few cents to access. Want us to
          mint one for you? Use the self-serve form.
        </p>
        <div class="cta-row">
          <a
            class="button primary"
            href="/link/request"
            data-analytics-click="click_request_link"
          >
            Request a paywalled link
          </a>
          <a
            class="button secondary"
            href="#generator"
            data-analytics-click="click_create_link"
            data-scroll-target="generator"
          >
            Manual (curl)
          </a>
          <a class="button secondary" href="/pricing" data-analytics-click="view_pricing">
            See pricing
          </a>
        </div>
      </section>
      <section id="generator" class="card" tabindex="-1">
        <h2>Manual flow</h2>
        <p>
          Origin URL: <code>https://example.com/my.pdf</code><br />
          Price per access (USDC): <code>0.01</code>
        </p>
        <pre><code>${escapeHtml(CREATE_LINK_CURL)}</code></pre>
        <div class="cta-row">
          <button
            class="button primary"
            type="button"
            data-copy="${escapeHtml(CREATE_LINK_CURL)}"
            data-copy-success="Copied!"
            data-copy-label="Copy curl request"
            data-analytics-click="click_copy_curl"
          >
            Copy curl request
          </button>
          <a class="button secondary" href="/docs/quickstart" data-analytics-click="view_docs">
            Open docs
          </a>
        </div>
      </section>
      <section>
        <ul>
          <li>We proxy your content after payment.</li>
          <li>Supported types: pages, JSON, images, PDFs, small files.</li>
          <li>Please respect copyright and local laws.</li>
        </ul>
      </section>`,
  });

const renderLinkRequest: RenderFn = () =>
  renderPage({
    title: 'Request a paywalled link',
    description:
      'Connect your wallet, configure pricing, and mint a Sol402 paywall link instantly when you hold enough SOL402.',
    path: '/link/request',
    analyticsEvent: 'view_link_request',
    content: html`<section class="hero">
        <span class="eyebrow">Self-serve beta</span>
        <h1>Launch a paywalled link in minutes</h1>
        <p class="subhead">
          Connect Phantom, point us at your origin, and we’ll mint a /p/ link with your wallet as payee.
        </p>
        <div class="cta-row">
          <a class="button secondary" href="/link" data-analytics-click="view_link">
            Back to overview
          </a>
          <a class="button secondary" href="/docs/quickstart" data-analytics-click="view_docs">
            Docs
          </a>
        </div>
      </section>
      <section class="card builder-card">
        <h2>Step 1 — connect your wallet</h2>
        <p>Hold ≥1M SOL402 to unlock the Baseline tier. Higher balances unlock bigger quotas instantly.</p>
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
          >
            Install Phantom
          </a>
        </div>
        <p class="builder-note">
          We never take custody of funds—Sol402 only reads your SOL402 balance to unlock the builder.
        </p>
      </section>
      <section class="card builder-card" id="builder-config" hidden>
        <h2>Step 2 — configure your paywall</h2>
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
              <small>Leave blank to use the default $0.005.</small>
            </label>
            <label>
              <span>Contact email (optional)</span>
              <input
                name="contactEmail"
                type="email"
                placeholder="you@example.com"
                inputmode="email"
              />
              <small>We’ll email perks, usage summaries, and future tier upgrades here.</small>
            </label>
          </div>
          <label>
            <span>Notes (optional)</span>
            <textarea
              name="notes"
              placeholder="Add context for the link, expected traffic, or anything else we should know."
            ></textarea>
          </label>
          <div class="form-actions">
            <button type="submit" class="button primary" data-analytics-click="submit_link_request">
              Mint paywalled link
            </button>
            <span class="request-form-note">
              Your API key appears once. Save it immediately after minting.
            </span>
          </div>
          <p id="link-request-status" class="status-message" data-variant="info"></p>
          <div id="link-request-success" class="success-summary" hidden></div>
        </form>
      </section>
      <section class="card">
        <h2>Tier perks</h2>
        <ul class="tier-list">
          <li>
            <strong>Baseline</strong> (≥1M SOL402): 3 links, 200 paid calls/day, 5 free calls/day from token perks.
          </li>
          <li>
            <strong>Growth</strong> (≥2M SOL402): 10 links, 500 paid calls/day, automatic 25% discount, priority
            retries.
          </li>
          <li>
            <strong>Premium</strong> (≥5M SOL402): 20 links, 2,000 paid calls/day, webhook & analytics exports, early
            feature access.
          </li>
        </ul>
      </section>
      <section class="card">
        <h2>Need help?</h2>
        <p>
          Reach out at <a href="mailto:admin@sol402.app">admin@sol402.app</a> if you have questions about
          pricing, discounts, or integrating with agents.
        </p>
      </section>
      <script type="module">
        const connectButton = document.getElementById('builder-connect');
        const connectStatus = document.getElementById('builder-connect-status');
        const configSection = document.getElementById('builder-config');
        const tierSummary = document.getElementById('builder-tier-summary');
        const form = document.getElementById('link-request-form');
        const statusEl = document.getElementById('link-request-status');
        const successEl = document.getElementById('link-request-success');
        const merchantInput = document.getElementById('link-request-merchant');
        const submitButton = form?.querySelector('button[type="submit"]');
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
            return;
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
          const linkUrl =
            typeof result?.linkUrl === 'string'
              ? result.linkUrl
              : result?.linkId
                ? window.location.origin + '/p/' + result.linkId
                : '';
          const apiKey = result?.apiKey ?? '';
          const walletBalance =
            typeof result?.walletBalance === 'string' ? formatTokens(result.walletBalance) : null;

          const balanceRow = walletBalance
            ? '<li>Detected SOL402 balance: ' + escapeHtml(walletBalance) + '</li>'
            : '';

          const dashboardButtonMarkup = apiKey
            ? '<a class="button secondary" href="' +
              escapeHtml(window.location.origin + '/dashboard?key=' + encodeURIComponent(apiKey)) +
              '" data-analytics-click="builder_open_dashboard">Open dashboard</a>'
            : '';

          const copyButtonMarkup = apiKey
            ? '<button type="button" class="button secondary" data-copy="' +
              escapeHtml(apiKey) +
              '" data-copy-label="Copy API key" data-copy-success="Copied!" data-analytics-click="builder_copy_api_key">Copy API key</button>'
            : '';

          successEl.innerHTML =
            "<h3>You're live!</h3>" +
            '<ul>' +
            '<li>Tier: ' +
            escapeHtml(tierLabel) +
            ' (' +
            escapeHtml(quotaSummary) +
            ')</li>' +
            '<li>Paywalled link: <a href="' +
            escapeHtml(linkUrl) +
            '" target="_blank" rel="noopener">' +
            escapeHtml(linkUrl) +
            '</a></li>' +
            '<li>API key (store securely): <code>' +
            escapeHtml(apiKey) +
            '</code></li>' +
            balanceRow +
            '</ul>' +
            '<p class="success-note">Copy the API key now — we only show it once.</p>' +
            '<div class="success-actions">' +
            dashboardButtonMarkup +
            copyButtonMarkup +
            '</div>';
          successEl.removeAttribute('hidden');

          const copyApiKeyButtonEl = successEl.querySelector('[data-copy]');
          if (copyApiKeyButtonEl) {
            copyApiKeyButtonEl.addEventListener('click', async () => {
              const target = copyApiKeyButtonEl;
              const originalLabel = target.getAttribute('data-copy-label') || target.textContent || 'Copy';
              const successLabel = target.getAttribute('data-copy-success') || 'Copied!';
              const payload = target.getAttribute('data-copy') || '';
              try {
                await navigator.clipboard.writeText(payload);
                target.textContent = successLabel;
                target.classList.add('copied');
                setTimeout(() => {
                  target.textContent = originalLabel;
                  target.classList.remove('copied');
                }, 2000);
              } catch (error) {
                console.warn('clipboard write failed', error);
              }
            });
          }
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
              setStatus('Connect a wallet holding ≥1M SOL402 before minting your link.', 'error');
              return;
            }

            const formData = new FormData(form);
            const origin = String(formData.get('origin') ?? '').trim();
            const priceRaw = String(formData.get('priceUsd') ?? '').trim();
            const contactEmail = String(formData.get('contactEmail') ?? '').trim();
            const notes = String(formData.get('notes') ?? '').trim();

            if (!origin) {
              setStatus('Origin URL is required.', 'error');
              return;
            }
            let originUrl;
            try {
              originUrl = new URL(origin);
            } catch {
              setStatus('Origin must be a valid HTTPS URL.', 'error');
              return;
            }
            if (originUrl.protocol !== 'https:') {
              setStatus('Origin must use HTTPS.', 'error');
              return;
            }

            if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
              setStatus('Enter a valid contact email or leave it blank.', 'error');
              return;
            }

            let priceUsd;
            if (priceRaw) {
              const parsed = Number(priceRaw);
              if (!Number.isFinite(parsed) || parsed <= 0) {
                setStatus('Price must be a positive number in USDC.', 'error');
                return;
              }
              priceUsd = Number(parsed.toFixed(6));
            }

            const payload = {
              origin: originUrl.toString(),
              priceUsd,
              merchantAddress: connectedWallet,
              contactEmail: contactEmail || undefined,
              notes: notes || undefined,
            };

            setStatus('Minting your link…', 'info');
            submitButton.setAttribute('disabled', 'true');

            try {
              const response = await fetch('/link/requests', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              let result = null;
              try {
                result = await response.json();
              } catch {
                result = null;
              }

              if (!response.ok) {
                const message =
                  (result && typeof result.message === 'string'
                    ? result.message
                    : result && result.error === 'validation_error'
                      ? 'Validation failed. Double-check your details and try again.'
                      : 'Unable to mint your link right now.') ?? 'Unable to mint your link.';
                setStatus(message, 'error');
                return;
              }

              setStatus('Link minted! Save the details below.', 'success');
              renderSuccess(result);
              if (result?.tier) {
                renderTierSummary({
                  wallet: connectedWallet,
                  balance: result?.walletBalance ?? currentTier?.balance,
                  eligible: true,
                  tier: result.tier,
                  thresholds: currentTier?.thresholds,
                  discountEligible: result?.discountEligible ?? currentTier?.discountEligible,
                  freeCallsEligible: result?.freeCallsEligible ?? currentTier?.freeCallsEligible,
                });
              }
              form.reset();
              if (merchantInput) {
                merchantInput.value = connectedWallet;
              }

              if (typeof window.sol402Track === 'function') {
                try {
                  window.sol402Track('link_request_submitted', {
                    requestId: result?.requestId ?? null,
                    tier: result?.tier?.id ?? null,
                  });
                } catch (trackingError) {
                  console.warn('sol402Track failed', trackingError);
                }
              }
            } catch (error) {
              console.error('Failed to mint link', error);
              setStatus('Network error. Please retry in a moment.', 'error');
            } finally {
              if (currentTier?.eligible) {
                submitButton.removeAttribute('disabled');
              } else {
                submitButton.setAttribute('disabled', 'true');
              }
            }
          });
        }
      </script>`,
  });

const renderDashboard: RenderFn = () =>
  renderPage({
    title: 'Dashboard — Manage Sol402 paywalled links',
    description: 'Paste your Sol402 API key to view usage, quotas, and links minted for your wallet.',
    path: '/dashboard',
    analyticsEvent: 'view_dashboard',
    content: html`<section class="hero">
        <span class="eyebrow">Publisher console</span>
        <h1>Dashboard</h1>
        <p class="subhead">
          Paste the scoped API key you received during provisioning to inspect usage, quotas, and
          payouts in one place.
        </p>
        <div class="cta-row">
          <a class="button secondary" href="/link/request" data-analytics-click="dashboard_request_link">
            Mint another link
          </a>
          <a class="button secondary" href="/docs/quickstart" data-analytics-click="dashboard_view_docs">
            View docs
          </a>
        </div>
      </section>
      <section class="card dashboard-card">
        <h2>Step 1 — authenticate</h2>
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
            <small>We never store your raw key. It lives in your browser only.</small>
          </label>
          <div class="dashboard-actions">
            <button type="submit" class="button primary" data-analytics-click="dashboard_submit_key">
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
              class="button secondary"
              data-analytics-click="dashboard_clear"
              hidden
            >
              Forget key
            </button>
          </div>
        </form>
        <p id="dashboard-status" class="status-message" data-variant="info"></p>
      </section>
      <section class="card dashboard-card" id="dashboard-summary" hidden>
        <h2>Summary</h2>
        <div id="dashboard-summary-body" class="dashboard-summary"></div>
      </section>
      <section class="card dashboard-card" id="dashboard-stats-card" hidden>
        <h2>Usage</h2>
        <div id="dashboard-stats" class="dashboard-stats" aria-live="polite"></div>
      </section>
      <section class="card dashboard-card" id="dashboard-links-card" hidden>
        <h2>Your links</h2>
        <div id="dashboard-links" class="dashboard-links" aria-live="polite">
          <p class="dashboard-empty">No links yet. Mint one from the self-serve flow.</p>
        </div>
      </section>
      <section class="card dashboard-card">
        <h2>Need a hand?</h2>
        <p>
          Email <a href="mailto:admin@sol402.app">admin@sol402.app</a> if you need API key rotation,
          quota boosts, or premium tier features.
        </p>
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
        const statsCard = document.getElementById('dashboard-stats-card');
        const statsGrid = document.getElementById('dashboard-stats');
        const linksCard = document.getElementById('dashboard-links-card');
        const linksGrid = document.getElementById('dashboard-links');
        const submitButton = form?.querySelector('button[type="submit"]');
        let currentKey = null;
        let isLoading = false;

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

        const setLoading = (loading) => {
          isLoading = loading;
          if (submitButton) {
            submitButton.toggleAttribute('disabled', loading);
          }
          if (refreshButton && !refreshButton.hasAttribute('hidden')) {
            refreshButton.toggleAttribute('disabled', loading);
          }
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
          if (summaryBody) summaryBody.innerHTML = '';
          if (statsGrid) statsGrid.innerHTML = '';
          if (linksGrid) {
            linksGrid.innerHTML =
              '<p class="dashboard-empty">No links yet. Mint one from the self-serve flow.</p>';
          }
        };

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
          const items = [
            {
              label: 'Paid calls',
              value: formatNumber(stats?.totalPaidCalls ?? 0),
              hint: 'Lifetime paid requests',
            },
            {
              label: 'Free calls',
              value: formatNumber(stats?.totalFreeCalls ?? 0),
              hint: 'Token perk usage',
            },
            {
              label: 'Revenue',
              value: formatUsd(stats?.totalRevenueUsd ?? 0),
              hint: 'Gross USDC settled',
            },
            {
              label: 'Last payment',
              value: formatDateTime(stats?.lastPaymentAt ?? null),
              hint: 'Most recent settlement',
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

          for (const link of links) {
            const tierId = link?.tier ?? 'baseline';
            const tierLabel = typeof link?.tierLabel === 'string' ? link.tierLabel : tierId;
            const price =
              typeof link?.priceUsd === 'number' && link.priceUsd > 0
                ? formatUsd(link.priceUsd)
                : '$0.005 default';
            const paidCalls = formatNumber(link?.usage?.totalPaidCalls ?? 0);
            const freeCalls = formatNumber(link?.usage?.totalFreeCalls ?? 0);
            const revenue = formatUsd(link?.usage?.totalRevenueUsd ?? 0);
            const createdAt = formatDateTime(link?.createdAt ?? null);

            const article = document.createElement('article');
            article.className = 'dashboard-link-card';

            const header = document.createElement('header');
            const urlContainer = document.createElement('div');
            urlContainer.className = 'link-url';
            const anchor = document.createElement('a');
            anchor.href = link?.linkUrl ?? '#';
            anchor.target = '_blank';
            anchor.rel = 'noopener';
            anchor.textContent = link?.linkUrl ?? '';
            urlContainer.append(anchor);

            const actions = document.createElement('div');
            actions.className = 'link-actions';
            const copyButton = document.createElement('button');
            copyButton.type = 'button';
            copyButton.className = 'button secondary';
            copyButton.setAttribute('data-copy', link?.linkUrl ?? '');
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
            paidSpan.textContent = 'Paid calls: ' + paidCalls;
            metaPrimary.append(paidSpan);

            const freeSpan = document.createElement('span');
            freeSpan.textContent = 'Free calls: ' + freeCalls;
            metaPrimary.append(freeSpan);

            const revenueSpan = document.createElement('span');
            revenueSpan.textContent = 'Revenue: ' + revenue;
            metaPrimary.append(revenueSpan);

            article.append(metaPrimary);

            const metaSecondary = document.createElement('div');
            metaSecondary.className = 'link-meta';
            const createdSpan = document.createElement('span');
            createdSpan.textContent = 'Created: ' + createdAt;
            metaSecondary.append(createdSpan);

            if (link?.apiKeyPreview) {
              const previewSpan = document.createElement('span');
              previewSpan.textContent = 'Key preview: ' + link.apiKeyPreview;
              metaSecondary.append(previewSpan);
            }

            article.append(metaSecondary);
            linksGrid.append(article);
          }

          linksCard.removeAttribute('hidden');
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
          renderStats(payload.stats || {});
          renderLinks(payload.links || []);
          showControls(true);
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
              requestDashboard(savedKey, { endpoint: '/dashboard/links', method: 'GET', silent: true });
            }
          } catch {
            /* storage unavailable */
          }
        }
      </script>`,
  });
const renderPricing: RenderFn = () =>
  renderPage({
    title: 'Pricing — simple per-request',
    description: 'Pay only when someone accesses your paywalled link or API.',
    path: '/pricing',
    analyticsEvent: 'view_pricing',
    content: html`<section class="hero">
        <h1>Simple, transparent pricing</h1>
        <p class="subhead">Pay only when someone accesses your paywalled link or API.</p>
      </section>
      <section class="card">
        <h2>Starter</h2>
        <p>$0.005 per request</p>
        <ul>
          <li>No monthly minimums</li>
          <li>USDC on Solana</li>
          <li>Perks: 5 free calls/day at ≥1M tokens, 25% discount once you reach ≥2M tokens</li>
        </ul>
        <p class="disclaimer">On-chain fees may apply. Large files or heavy compute may require higher per-link pricing.</p>
      </section>
      <section class="card">
        <h2>FAQ teaser</h2>
        <dl class="questions">
          <dt>Do I need an account?</dt>
          <dd>No. It’s pure HTTP. Bring your wallet; clients can pay via x402.</dd>
        </dl>
      </section>`,
  });

const renderQuickstart: RenderFn = () =>
  renderPage({
    title: 'Quickstart — x402 in 5 minutes',
    description: 'Create a paywalled link and test the 402 flow.',
    path: '/docs/quickstart',
    analyticsEvent: 'view_docs',
    content: html`<section class="hero">
        <h1>Quickstart — x402 in 5 minutes</h1>
        <p class="subhead">Create a paywalled link and test the 402 flow.</p>
      </section>
      <section class="card">
        <ol>
          <li>Create a link — <code>POST /admin/links { origin, priceUsd }</code></li>
          <li>Test 402 — <code>curl -i https://sol402.app/p/&lt;id&gt;</code></li>
          <li>Pay — Use an x402 client or facilitator UI to pay the requirement.</li>
          <li>Retry with X-PAYMENT — <code>curl -H "X-PAYMENT: &lt;payload&gt;" https://sol402.app/p/&lt;id&gt;</code></li>
          <li>Receive content + X-PAYMENT-RESPONSE</li>
        </ol>
        <p class="disclaimer">Tip: Use solana-devnet for testing. Swap to mainnet when ready.</p>
      </section>`,
  });

const renderToken: RenderFn = () =>
  renderPage({
    title: 'Token utility & perks',
    description: 'Non-financial utility for SOL402: discounts and daily free calls.',
    path: '/token',
    analyticsEvent: 'view_token',
    content: html`<section class="hero">
        <h1>Token utility &amp; perks</h1>
        <p class="subhead">Non-financial utility for SOL402: discounts and daily free calls.</p>
      </section>
      <section class="card">
        <h2>Token details</h2>
        <ul>
          <li>Symbol: SOL402</li>
          <li>Token CA: HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump</li>
        </ul>
      </section>
      <section class="card">
        <h2>Perks today</h2>
        <ul>
          <li>Holder discount: 25% off per-request price (hold ≥2M tokens)</li>
          <li>Daily free calls: 5 calls/day at ≥1M tokens (quota resets every UTC day)</li>
        </ul>
      </section>
      <section class="card">
        <h2>How it works</h2>
        <ul>
          <li>We check your wallet’s SOL402 balance on Solana.</li>
          <li>Holding ≥2M tokens applies the 25% discount automatically.</li>
          <li>Holding ≥1M tokens earns 5 free calls/day until the daily quota resets.</li>
        </ul>
        <p class="disclaimer">Utility terms may evolve; we’ll post updates on /changelog.</p>
      </section>`,
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
          <a class="button primary" href="/link" data-analytics-click="demo_create_link">
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
  { path: '/link', render: renderLink },
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
