import { createX402Client } from '@payai/x402-solana/client';
import type { SolanaNetwork, WalletAdapter } from '@payai/x402-solana/types';
import type { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

interface DemoConfig {
  demoUrl: string;
  rpcUrl: string;
  fallbackRpcUrl?: string;
  network: SolanaNetwork;
}

declare global {
  interface Window {
    sol402DemoConfig?: DemoConfig;
  }
}

// Ensure Buffer exists in the browser environment required by the SDK.
if (typeof globalThis.Buffer === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Buffer = Buffer;
}

const connectButton = document.querySelector<HTMLButtonElement>('#sol402-demo-connect');
const payButton = document.querySelector<HTMLButtonElement>('#sol402-demo-pay');
const logEl = document.querySelector<HTMLPreElement>('#sol402-demo-log');
const resultEl = document.querySelector<HTMLPreElement>('#sol402-demo-result');

const config = window.sol402DemoConfig;

const assertConfig = (): DemoConfig => {
  if (!config?.demoUrl || !config?.rpcUrl || !config?.network) {
    throw new Error('Demo configuration missing. Reload the page and try again.');
  }
  return config;
};

const log = (message: string) => {
  const now = new Date().toLocaleTimeString();
  if (logEl) {
    logEl.textContent = `[${now}] ${message}`;
  }
};

const setResult = (message: string, muted = false) => {
  if (!resultEl) {
    return;
  }
  resultEl.textContent = message;
  resultEl.classList.toggle('demo-result--muted', muted);
};

const resolveRpcEndpoint = (endpoint?: string) => {
  if (!endpoint) {
    return undefined;
  }
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  try {
    return new URL(endpoint, window.location.origin).toString();
  } catch {
    return undefined;
  }
};

type PhantomProvider = WalletAdapter & {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  publicKey?: {
    toString(): string;
  };
};

const ensurePhantom = () => {
  const provider = (window as unknown as { solana?: PhantomProvider }).solana;
  if (provider?.isPhantom) {
    return provider;
  }
  throw new Error('Phantom wallet not detected. Install the extension and refresh.');
};

let provider: PhantomProvider | null = null;
let connected = false;
let connectedPublicKey: { toString(): string } | undefined;
let connectedAddress: string | undefined;

connectButton?.addEventListener('click', async () => {
  try {
    provider = ensurePhantom();
    log('Requesting wallet connection…');
    const { publicKey } = await provider.connect();
    connectedPublicKey = publicKey;
    connectedAddress = publicKey.toString();
    log(`Connected ${publicKey.toString()}. Ready to pay.`);
    connectButton.disabled = true;
    if (payButton) {
      payButton.disabled = false;
    }
    connected = true;
  } catch (error) {
    console.error(error);
    log((error as Error)?.message ?? 'Wallet connection failed.');
  }
});

payButton?.addEventListener('click', async () => {
  if (!connected || !provider) {
    log('Connect your wallet first.');
    return;
  }

  const { demoUrl, rpcUrl, fallbackRpcUrl, network } = assertConfig();

  payButton.disabled = true;
  setResult('Pending…', true);
  log('Preparing payment. Approve the transaction in Phantom.');

  try {
    const publicKey = connectedPublicKey ?? provider.publicKey;
    if (!publicKey) {
      throw new Error('Wallet public key unavailable. Reconnect Phantom and try again.');
    }

    const walletAdapter: WalletAdapter = {
      address: connectedAddress ?? publicKey.toString(),
      publicKey,
      signTransaction: async (transaction: VersionedTransaction) => {
        if (!provider?.signTransaction) {
          throw new Error('Connected wallet does not support signTransaction');
        }
        return provider.signTransaction(transaction);
      },
    };

    const primaryRpc = resolveRpcEndpoint(rpcUrl);
    const secondaryRpc = resolveRpcEndpoint(fallbackRpcUrl);
    const candidateSet = new Set<string | undefined>();
    if (primaryRpc) {
      candidateSet.add(primaryRpc);
    }
    if (secondaryRpc) {
      candidateSet.add(secondaryRpc);
    }
    if (candidateSet.size === 0) {
      candidateSet.add(undefined);
    }
    const rpcCandidates = Array.from(candidateSet);

    let response: Response | null = null;
    let lastError: unknown;

    for (const candidate of rpcCandidates) {
      try {
        const client = createX402Client({
          wallet: walletAdapter,
          network,
          ...(candidate ? { rpcUrl: candidate } : {}),
          maxPaymentAmount: BigInt(10_000),
        });

        response = await client.fetch(demoUrl, {
          headers: {
            accept: 'application/json',
          },
        });
        break;
      } catch (attemptError) {
        lastError = attemptError;
        log(
          candidate
            ? `RPC ${candidate} failed (${(attemptError as Error)?.message ?? 'error'}). Retrying with fallback…`
            : (attemptError as Error)?.message ?? 'RPC request failed.'
        );
      }
    }

    if (!response) {
      throw lastError ?? new Error('Payment fetch failed and no fallback succeeded.');
    }

    const body = await response.text();
    let displayBody = body;
    try {
      const parsed = JSON.parse(body);
      displayBody = JSON.stringify(parsed, null, 2);
    } catch {
      // Non-JSON body, leave as-is.
    }
    log(`Completed with status ${response.status}.`);
    setResult(displayBody || '(empty response)', !displayBody);
  } catch (error) {
    console.error(error);
    log((error as Error)?.message ?? 'Payment failed. Check the console for details.');
    setResult('No response — payment or fetch failed.', true);
  } finally {
    payButton.disabled = false;
  }
});
