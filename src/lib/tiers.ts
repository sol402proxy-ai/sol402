import type { AppConfig } from '../config.js';
import type { LinkTierId } from '../types.js';

export interface TierDefinition {
  id: LinkTierId;
  label: string;
  minBalance: bigint;
  dailyRequestCap: number;
  maxActiveLinks: number;
}

export interface TierProgress {
  currentTier?: TierDefinition;
  nextTier?: TierDefinition;
}

export function buildTierTable(config: AppConfig): TierDefinition[] {
  const tiers: TierDefinition[] = [
    {
      id: 'premium',
      label: 'Premium',
      minBalance: config.premiumTokenThreshold,
      dailyRequestCap: 2_000,
      maxActiveLinks: 25,
    },
    {
      id: 'growth',
      label: 'Growth',
      minBalance: config.tokenHolderThreshold,
      dailyRequestCap: 500,
      maxActiveLinks: 10,
    },
    {
      id: 'baseline',
      label: 'Baseline',
      minBalance: config.freeCallTokenThreshold,
      dailyRequestCap: 200,
      maxActiveLinks: 3,
    },
  ];

  return tiers.sort((a, b) => Number(b.minBalance - a.minBalance));
}

export function resolveTier(balance: bigint, tiers: TierDefinition[]): TierDefinition | undefined {
  return tiers.find((tier) => balance >= tier.minBalance);
}

export function getTierProgress(balance: bigint, tiers: TierDefinition[]): TierProgress {
  const ordered = tiers.slice(); // already sorted descending by buildTierTable
  let current: TierDefinition | undefined;
  let next: TierDefinition | undefined;

  for (let index = 0; index < ordered.length; index += 1) {
    const tier = ordered[index];
    if (balance >= tier.minBalance) {
      current = tier;
      next = index > 0 ? ordered[index - 1] : undefined;
      break;
    }
  }

  if (!current) {
    next = ordered[ordered.length - 1];
  }

  return {
    currentTier: current,
    nextTier: next,
  };
}
