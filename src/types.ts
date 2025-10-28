export type LinkId = string;

export type LinkTierId = 'baseline' | 'growth' | 'premium';

export interface LinkUsage {
  totalPaidCalls: number;
  totalFreeCalls: number;
  totalRevenueUsd: number;
  lastPaymentAt?: Date;
}

export interface UpdateLinkUsageInput {
  paidCallsDelta?: number;
  freeCallsDelta?: number;
  revenueUsdDelta?: number;
  lastPaymentAt?: Date;
  reset?: boolean;
}

export interface PaywallLink {
  id: LinkId;
  origin: string;
  priceUsd?: number;
  createdAt: Date;
  merchantAddress?: string;
  contactEmail?: string;
  requester?: string;
  requestId?: string;
  notes?: string;
  adminNotes?: string;
  tier?: LinkTierId;
  tierLabel?: string;
  apiKeyHash?: string;
  apiKeyPreview?: string;
  dailyRequestCap?: number;
  maxActiveLinks?: number;
  usage?: LinkUsage;
}

export interface CreateLinkInput {
  origin: string;
  priceUsd?: number;
  merchantAddress?: string;
  contactEmail?: string;
  requester?: string;
  requestId?: string;
  notes?: string;
  adminNotes?: string;
  tier?: LinkTierId;
  tierLabel?: string;
  apiKeyHash?: string;
  apiKeyPreview?: string;
  dailyRequestCap?: number;
  maxActiveLinks?: number;
  usage?: LinkUsage;
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
  resource?: string;
  mimeType?: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: Record<string, any>;
}

export interface PaymentChallenge {
  x402Version: number;
  facilitatorUrl: string;
  accepts: PaymentChallengeAccept[];
}

export type LinkRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LinkRequest {
  id: string;
  origin: string;
  priceUsd?: number;
  merchantAddress: string;
  contactEmail?: string;
  requestedBy?: string;
  notes?: string;
  adminNotes?: string;
  status: LinkRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  linkId?: string;
  tier?: LinkTierId;
  tierLabel?: string;
  apiKeyHash?: string;
  apiKeyPreview?: string;
  dailyRequestCap?: number;
  maxActiveLinks?: number;
}

export interface CreateLinkRequestInput {
  origin: string;
  priceUsd?: number;
  merchantAddress: string;
  contactEmail?: string;
  requestedBy?: string;
  notes?: string;
  tier?: LinkTierId;
  tierLabel?: string;
  apiKeyHash?: string;
  apiKeyPreview?: string;
  dailyRequestCap?: number;
  maxActiveLinks?: number;
}

export interface UpdateLinkRequestInput {
  status?: LinkRequestStatus;
  linkId?: string;
  processedAt?: Date;
  notes?: string;
  adminNotes?: string;
  merchantAddress?: string;
  priceUsd?: number;
  contactEmail?: string;
  requestedBy?: string;
  tier?: LinkTierId;
  tierLabel?: string;
  apiKeyHash?: string;
  apiKeyPreview?: string;
  dailyRequestCap?: number;
  maxActiveLinks?: number;
}

export interface ListLinkRequestsOptions {
  status?: LinkRequestStatus;
  limit?: number;
}
