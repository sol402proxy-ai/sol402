import { z } from 'zod';

export const envSchema = z.object({
  NETWORK: z.enum(['solana', 'solana-devnet']).default('solana'),
  FACILITATOR_URL: z.string().url().default('https://facilitator.payai.network'),
  MERCHANT_ADDRESS: z
    .string()
    .default('DEMO_MERCHANT_SOL402')
    .describe('Destination account for settled payments'),
  USDC_MINT: z.string().default('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  DEFAULT_PRICE_USD: z.coerce.number().min(0).default(0.005),
  PRICE_DECIMALS: z.coerce.number().int().min(0).default(6),
  TOKEN_MINT: z.string().default('HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump'),
  TOKEN_HOLDER_THRESHOLD: z.coerce.number().int().min(0).default(2_000_000),
  PREMIUM_TOKEN_THRESHOLD: z.coerce.number().int().min(0).default(5_000_000),
  HOLDER_DISCOUNT_BPS: z.coerce.number().int().min(0).default(2_500),
  FREE_CALLS_PER_WALLET_PER_DAY: z.coerce.number().int().min(0).default(5),
  FREE_CALLS_TOKEN_THRESHOLD: z.coerce.number().int().min(0).default(1_000_000),
  ADMIN_API_KEY: z.string().default('dev-admin-key'),
  SOLANA_RPC_URL: z.string().url().optional(),
  RPC_METRICS_URL: z.string().url().optional(),
  RPC_METRICS_AUTH_HEADER: z.string().optional(),
  ANALYTICS_SINK_URL: z.string().url().optional(),
  ANALYTICS_SINK_AUTH_HEADER: z.string().optional(),
  ANALYTICS_SINK_DATABASE: z.string().optional(),
  ANALYTICS_SINK_TABLE: z.string().optional(),
  PORT: z.coerce.number().int().min(0).default(4020),
});

export type ParsedEnv = z.infer<typeof envSchema>;

export function parseEnvRecord(record: Record<string, unknown>): ParsedEnv {
  const parsed = envSchema.safeParse(record);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${JSON.stringify(parsed.error.format())}`);
  }
  return parsed.data;
}
