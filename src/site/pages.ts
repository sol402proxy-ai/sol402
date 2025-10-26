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
          Paste a URL, set a price, get a /p/ short link. Visitors pay a few cents to access.
        </p>
        <div class="cta-row">
          <a
            class="button primary"
            href="#generator"
            data-analytics-click="click_create_link"
            data-scroll-target="generator"
          >
            Create a paywalled link
          </a>
          <a class="button secondary" href="/pricing" data-analytics-click="view_pricing">
            See pricing
          </a>
        </div>
      </section>
      <section id="generator" class="card" tabindex="-1">
        <h2>Simple form</h2>
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
      <script type="module">
        const DEMO_URL = 'https://sol402.app/p/a11a560a-d530-4dee-88da-4783862e0d33';
        const RPC_URL = 'https://solana-mainnet.rpc.extrnode.com/b25026fe-8bd3-4f49-beba-64e75db8deb6';
        const NETWORK = 'solana';

        const connectButton = document.querySelector('#sol402-demo-connect');
        const payButton = document.querySelector('#sol402-demo-pay');
        const logEl = document.querySelector('#sol402-demo-log');
        const resultEl = document.querySelector('#sol402-demo-result');

        const log = (message) => {
          const now = new Date().toLocaleTimeString();
          logEl.textContent = \`[\${now}] \${message}\`;
        };

        const setResult = (message, muted = false) => {
          resultEl.textContent = message;
          resultEl.classList.toggle('demo-result--muted', muted);
        };

        const ensurePhantom = () => {
          const provider = window?.solana;
          if (provider?.isPhantom) {
            return provider;
          }
          throw new Error('Phantom wallet not detected. Install the extension and refresh.');
        };

        let provider = null;
        let connected = false;

        connectButton?.addEventListener('click', async () => {
          try {
            provider = ensurePhantom();
            log('Requesting wallet connection…');
            const { publicKey } = await provider.connect();
            log(\`Connected \${publicKey.toBase58()}. Ready to pay.\`);
            connectButton.disabled = true;
            payButton.disabled = false;
            connected = true;
          } catch (error) {
            console.error(error);
            log(error?.message || 'Wallet connection failed.');
          }
        });

        payButton?.addEventListener('click', async () => {
          if (!connected) {
            log('Connect your wallet first.');
            return;
          }

          payButton.disabled = true;
          setResult('Pending…', true);
          log('Preparing payment. Approve the transaction in Phantom.');

          try {
            const { createX402Client } = await import(
              'https://esm.sh/@payai/x402-solana@0.1.0/client?bundle'
            );

            const walletAdapter = {
              address: provider.publicKey.toBase58(),
              publicKey: {
                toString: () => provider.publicKey.toBase58(),
              },
              async signTransaction(transaction) {
                const signed = await provider.signTransaction(transaction);
                return signed;
              },
            };

            const client = createX402Client({
              wallet: walletAdapter,
              network: NETWORK,
              rpcUrl: RPC_URL,
              maxPaymentAmount: BigInt(10_000), // 0.01 USDC ceiling
            });

            const response = await client.fetch(DEMO_URL, {
              headers: {
                accept: 'application/json',
              },
            });

            const body = await response.text();
            let displayBody = body;
            try {
              const parsed = JSON.parse(body);
              displayBody = JSON.stringify(parsed, null, 2);
            } catch {
              /* non-JSON body */
            }
            log(\`Completed with status \${response.status}.\`);
            setResult(displayBody || '(empty response)', !displayBody);
          } catch (error) {
            console.error(error);
            log(error?.message || 'Payment failed. Check the console for details.');
            setResult('No response — payment or fetch failed.', true);
          } finally {
            payButton.disabled = false;
          }
        });
      </script>`,
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
