/* c8 ignore start */

import { createApp } from './app.js';
import { parseEnvRecord } from './lib/env-schema.js';
import {
  createWorkersKVLinkStore,
  type WorkersKVNamespace,
} from './lib/store-workers.js';
import type { AppConfig } from './config.js';
import { createWorkersKVAnalyticsStore } from './lib/analytics-store-workers.js';
import { AnalyticsExporter } from './lib/analytics-exporter.js';

interface R2ObjectBody {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
}

interface WorkerEnv {
  LINKS_KV: WorkersKVNamespace;
  ANALYTICS_KV: WorkersKVNamespace;
  MARKETING_ASSETS?: R2Bucket;
  ANALYTICS_SINK_URL?: string;
  ANALYTICS_SINK_AUTH_HEADER?: string;
  ANALYTICS_SINK_DATABASE?: string;
  ANALYTICS_SINK_TABLE?: string;
  NETWORK?: string;
  FACILITATOR_URL?: string;
  MERCHANT_ADDRESS?: string;
  USDC_MINT?: string;
  DEFAULT_PRICE_USD?: string;
  PRICE_DECIMALS?: string;
  TOKEN_MINT?: string;
  TOKEN_HOLDER_THRESHOLD?: string;
  HOLDER_DISCOUNT_BPS?: string;
  FREE_CALLS_PER_WALLET_PER_DAY?: string;
  FREE_CALLS_TOKEN_THRESHOLD?: string;
  ADMIN_API_KEY?: string;
  SOLANA_RPC_URL?: string;
  PORT?: string;
  RPC_METRICS_URL?: string;
  RPC_METRICS_AUTH_HEADER?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  props: Record<string, unknown>;
}

function buildConfig(env: WorkerEnv): AppConfig {
  const parsed = parseEnvRecord({
    NETWORK: env.NETWORK,
    FACILITATOR_URL: env.FACILITATOR_URL,
    MERCHANT_ADDRESS: env.MERCHANT_ADDRESS,
    USDC_MINT: env.USDC_MINT,
    DEFAULT_PRICE_USD: env.DEFAULT_PRICE_USD,
    PRICE_DECIMALS: env.PRICE_DECIMALS,
    TOKEN_MINT: env.TOKEN_MINT,
    TOKEN_HOLDER_THRESHOLD: env.TOKEN_HOLDER_THRESHOLD,
    HOLDER_DISCOUNT_BPS: env.HOLDER_DISCOUNT_BPS,
    FREE_CALLS_PER_WALLET_PER_DAY: env.FREE_CALLS_PER_WALLET_PER_DAY,
    FREE_CALLS_TOKEN_THRESHOLD: env.FREE_CALLS_TOKEN_THRESHOLD,
    ADMIN_API_KEY: env.ADMIN_API_KEY,
    SOLANA_RPC_URL: env.SOLANA_RPC_URL,
    PORT: env.PORT,
  });

  return {
    adminApiKey: parsed.ADMIN_API_KEY,
    defaultPriceUsd: parsed.DEFAULT_PRICE_USD,
    priceDecimals: parsed.PRICE_DECIMALS,
    facilitatorUrl: parsed.FACILITATOR_URL,
    merchantAddress: parsed.MERCHANT_ADDRESS,
    network: parsed.NETWORK,
    usdcMint: parsed.USDC_MINT,
    tokenMint: parsed.TOKEN_MINT,
    tokenHolderThreshold: BigInt(parsed.TOKEN_HOLDER_THRESHOLD),
    holderDiscountBps: parsed.HOLDER_DISCOUNT_BPS,
    freeCallsPerWalletPerDay: parsed.FREE_CALLS_PER_WALLET_PER_DAY,
    freeCallTokenThreshold: BigInt(parsed.FREE_CALLS_TOKEN_THRESHOLD),
    solanaRpcUrl: parsed.SOLANA_RPC_URL,
    rpcMetricsUrl: parsed.RPC_METRICS_URL,
    rpcMetricsAuthHeader: parsed.RPC_METRICS_AUTH_HEADER,
  };
}

function createAssetProvider(env: WorkerEnv) {
  if (!env.MARKETING_ASSETS) {
    return undefined;
  }
  const bucket = env.MARKETING_ASSETS;
  return {
    getTextAsset: async (path: string): Promise<string | undefined> => {
      const object = await bucket.get(path);
      if (!object) {
        return undefined;
      }
      return object.text();
    },
    getBinaryAsset: async (path: string): Promise<Uint8Array | undefined> => {
      const object = await bucket.get(path);
      if (!object) {
        return undefined;
      }
      const arrayBuffer = await object.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    },
  };
}

let cachedApp: ReturnType<typeof createApp> | null = null;

function getApp(env: WorkerEnv) {
  if (!cachedApp) {
    const config = buildConfig(env);
    const store = createWorkersKVLinkStore(env.LINKS_KV);
    cachedApp = createApp({
      config,
      store,
      assetProvider: createAssetProvider(env),
      analyticsStore: createWorkersKVAnalyticsStore(env.ANALYTICS_KV),
    });
  }
  return cachedApp;
}

function createAnalyticsExporter(env: WorkerEnv) {
  return new AnalyticsExporter(env.ANALYTICS_KV, {
    sinkUrl: env.ANALYTICS_SINK_URL,
    authHeaderValue: env.ANALYTICS_SINK_AUTH_HEADER,
    fetchFn: fetch,
    database: env.ANALYTICS_SINK_DATABASE,
    table: env.ANALYTICS_SINK_TABLE,
  });
}

export default {
  fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const app = getApp(env);
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: { cron: string }, env: WorkerEnv) {
    if (!env.ANALYTICS_KV) {
      console.warn('Scheduled analytics flush skipped: ANALYTICS_KV binding missing');
      return;
    }
    const exporter = createAnalyticsExporter(env);
    const exported = await exporter.exportAll();
    console.info('Analytics events exported', {
      exported,
      cron: event.cron,
    });
  },
};

export function __resetWorkerApp() {
  cachedApp = null;
}
/* c8 ignore end */
