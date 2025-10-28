import { env, requireEnv } from './lib/env.js';

export interface AppConfig {
  adminApiKey: string;
  defaultPriceUsd: number;
  priceDecimals: number;
  facilitatorUrl: string;
  merchantAddress: string;
  network: 'solana' | 'solana-devnet';
  usdcMint: string;
  tokenMint: string;
  tokenHolderThreshold: bigint;
  premiumTokenThreshold: bigint;
  holderDiscountBps: number;
  freeCallsPerWalletPerDay: number;
  freeCallTokenThreshold: bigint;
  solanaRpcUrl?: string;
  rpcMetricsUrl?: string;
  rpcMetricsAuthHeader?: string;
  analyticsSinkUrl?: string;
  analyticsSinkAuthHeader?: string;
  analyticsSinkDatabase?: string;
  analyticsSinkTable?: string;
}

export function loadConfig(): AppConfig {
  return {
    adminApiKey: requireEnv('ADMIN_API_KEY'),
    defaultPriceUsd: env.DEFAULT_PRICE_USD,
    priceDecimals: env.PRICE_DECIMALS,
    facilitatorUrl: env.FACILITATOR_URL,
    merchantAddress: requireEnv('MERCHANT_ADDRESS'),
    network: env.NETWORK,
    usdcMint: env.USDC_MINT,
    tokenMint: env.TOKEN_MINT,
    tokenHolderThreshold: BigInt(env.TOKEN_HOLDER_THRESHOLD),
    premiumTokenThreshold: BigInt(env.PREMIUM_TOKEN_THRESHOLD),
    holderDiscountBps: env.HOLDER_DISCOUNT_BPS,
    freeCallsPerWalletPerDay: env.FREE_CALLS_PER_WALLET_PER_DAY,
    freeCallTokenThreshold: BigInt(env.FREE_CALLS_TOKEN_THRESHOLD),
    solanaRpcUrl: env.SOLANA_RPC_URL,
    rpcMetricsUrl: env.RPC_METRICS_URL,
    rpcMetricsAuthHeader: env.RPC_METRICS_AUTH_HEADER,
    analyticsSinkUrl: env.ANALYTICS_SINK_URL,
    analyticsSinkAuthHeader: env.ANALYTICS_SINK_AUTH_HEADER,
    analyticsSinkDatabase: env.ANALYTICS_SINK_DATABASE,
    analyticsSinkTable: env.ANALYTICS_SINK_TABLE,
  };
}
