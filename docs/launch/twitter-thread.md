# X / Twitter Thread

1/ Introducing Sol402 — turn any URL or API into a pay-per-request endpoint.

It’s x402-native, uses USDC on Solana, and takes minutes to set up.

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
