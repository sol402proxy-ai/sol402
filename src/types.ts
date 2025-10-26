export type LinkId = string;

export interface PaywallLink {
  id: LinkId;
  origin: string;
  priceUsd?: number;
  createdAt: Date;
}

export interface CreateLinkInput {
  origin: string;
  priceUsd?: number;
}

export interface PriceQuote {
  priceAtomic: bigint;
  priceUsd: number;
  reason: string;
  discountApplied: boolean;
  freeQuotaUsed: boolean;
}

export interface PaymentChallengeAccept {
  scheme: 'exact';
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  priceUsd: number;
  reason: string;
  discountApplied: boolean;
  freeQuotaUsed: boolean;
}

export interface PaymentChallenge {
  x402Version: number;
  facilitatorUrl: string;
  accepts: PaymentChallengeAccept[];
}
