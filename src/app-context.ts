import type { AppConfig } from './config.js';
import type { Logger } from './lib/logger.js';
import type { TokenBucketRateLimiter } from './lib/rate-limit.js';
import type { TokenPerksService } from './lib/token.js';
import type { LinkStore } from './lib/store.js';
import type { AnalyticsStore } from './lib/analytics-store.js';
import type { PaymentRequirements } from './lib/payments.js';
import type { PaywallLink, PaymentChallenge, PriceQuote } from './types.js';

export interface AppVariables {
  store: LinkStore;
  config: AppConfig;
  logger: Logger;
  rateLimiter: TokenBucketRateLimiter;
  tokenService: TokenPerksService;
  analyticsStore: AnalyticsStore;
  link?: PaywallLink;
  priceQuote?: PriceQuote;
  paymentReceipt?: string;
  paymentRequired?: boolean;
  paymentChallenge?: PaymentChallenge;
  paymentRequirements?: PaymentRequirements;
}

export type HonoAppEnv = {
  Variables: AppVariables;
};
