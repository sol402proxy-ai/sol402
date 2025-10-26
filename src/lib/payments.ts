import { X402PaymentHandler } from '@payai/x402-solana/server';
import { isSolanaNetwork } from '@payai/x402-solana/types';
import type { PaymentRequirements, RouteConfig } from 'x402/types';

import type { AppConfig } from '../config.js';
import type { PaymentChallenge, PaymentChallengeAccept, PriceQuote } from '../types.js';

const X402_VERSION = 1;

export interface PaymentRequirementContext {
  requestUrl: string;
  quote: PriceQuote;
}

export class PayAiSolanaPayments {
  private readonly handler: X402PaymentHandler;
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    if (!isSolanaNetwork(config.network)) {
      throw new Error(`Unsupported network "${config.network}" for SOL402 payments`);
    }

    this.config = config;
    this.handler = new X402PaymentHandler({
      network: config.network,
      treasuryAddress: config.merchantAddress,
      facilitatorUrl: config.facilitatorUrl,
      rpcUrl: config.solanaRpcUrl,
    });
  }

  async createRequirements(context: PaymentRequirementContext): Promise<PaymentRequirements> {
    const route = {
      network: this.config.network,
      price: {
        amount: context.quote.priceAtomic.toString(),
        asset: {
          address: this.config.usdcMint,
          decimals: this.config.priceDecimals,
        },
      },
      config: {
        resource: context.requestUrl,
        description: context.quote.reason,
        mimeType: 'application/json',
      },
    } as const;

    const requirements = await this.handler.createPaymentRequirements(
      route as unknown as RouteConfig,
      context.requestUrl
    );

    return requirements as unknown as PaymentRequirements;
  }

  buildChallenge(requirements: PaymentRequirements, quote: PriceQuote): PaymentChallenge {
    const accept: PaymentChallengeAccept = {
      scheme: requirements.scheme,
      network: requirements.network,
      asset: requirements.asset,
      payTo: requirements.payTo,
      maxAmountRequired: requirements.maxAmountRequired,
      priceUsd: quote.priceUsd,
      reason: quote.reason,
      discountApplied: quote.discountApplied,
      freeQuotaUsed: quote.freeQuotaUsed,
      resource: requirements.resource,
      mimeType: requirements.mimeType,
      description: requirements.description ?? undefined,
      extra: requirements.extra ?? undefined,
    };

    return {
      x402Version: X402_VERSION,
      facilitatorUrl: this.config.facilitatorUrl,
      accepts: [accept],
    };
  }

  async verify(header: string, requirements: PaymentRequirements): Promise<boolean> {
    return this.handler.verifyPayment(header, requirements);
  }

  async settle(header: string, requirements: PaymentRequirements): Promise<boolean> {
    return this.handler.settlePayment(header, requirements);
  }
}

export type { PaymentRequirements };
