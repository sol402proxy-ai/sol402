import { describe, expect, it } from 'vitest';
import type { Connection } from '@solana/web3.js';
import type { AppConfig } from '../../src/config.js';
import { TokenPerksService } from '../../src/lib/token.js';

const baseConfig: AppConfig = {
  adminApiKey: 'test-admin',
  defaultPriceUsd: 0.005,
  priceDecimals: 6,
  facilitatorUrl: 'https://facilitator.test',
  merchantAddress: 'merchant-test',
  network: 'solana',
  usdcMint: 'mint-test',
  tokenMint: '',
  tokenHolderThreshold: 2_000_000n,
  holderDiscountBps: 2_500,
  freeCallsPerWalletPerDay: 5,
  freeCallTokenThreshold: 0n,
  solanaRpcUrl: undefined,
  rpcMetricsUrl: undefined,
  rpcMetricsAuthHeader: undefined,
};

class TestTokenPerksService extends TokenPerksService {
  constructor(
    config: AppConfig,
    private discountBps = 0
  ) {
    super(config);
  }

  public setDiscount(bps: number) {
    this.discountBps = bps;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected override async shouldApplyHolderDiscount(
    _payer: string,
    _holderBalance?: bigint
  ): Promise<number> {
    return this.discountBps;
  }
}

class RetryTokenPerksService extends TokenPerksService {
  public attempts = 0;
  public delays: number[] = [];

  constructor(
    config: AppConfig,
    private readonly succeedWith: bigint,
    private readonly failuresBeforeSuccess: number
  ) {
    super(config, {
      connection: {} as unknown as Connection,
      maxRpcAttempts: 4,
      retryBackoffMs: 75,
    });
  }

  protected override async performBalanceFetch(): Promise<bigint> {
    this.attempts += 1;
    if (this.attempts <= this.failuresBeforeSuccess) {
      throw new Error('RPC unavailable');
    }
    return this.succeedWith;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected override async sleep(ms: number): Promise<void> {
    this.delays.push(ms);
  }
}

class BalanceTokenPerksService extends TokenPerksService {
  constructor(
    config: AppConfig,
    private readonly balance: bigint
  ) {
    super(config, {
      connection: {} as unknown as Connection,
    });
  }

  protected override async performBalanceFetch(): Promise<bigint> {
    return this.balance;
  }
}

describe('TokenPerksService', () => {
  it('returns base price when no payer is supplied', async () => {
    const service = new TokenPerksService({
      ...baseConfig,
      freeCallsPerWalletPerDay: 0,
    });

    const result = await service.adjustPrice({
      basePriceAtomic: 5_000n,
    });

    expect(result.priceAtomic).toBe(5_000n);
    expect(result.reason).toBe('base-price');
    expect(result.discountApplied).toBe(false);
    expect(result.freeQuotaUsed).toBe(false);
  });

  it('applies free quota once per payer per day', async () => {
    const service = new TokenPerksService({
      ...baseConfig,
      freeCallsPerWalletPerDay: 1,
    });

    const first = await service.adjustPrice({
      basePriceAtomic: 5_000n,
      payer: 'wallet1',
    });
    expect(first.priceAtomic).toBe(0n);
    expect(first.freeQuotaUsed).toBe(true);
    expect(first.reason).toBe('free-quota');

    const second = await service.adjustPrice({
      basePriceAtomic: 5_000n,
      payer: 'wallet1',
    });
    expect(second.priceAtomic).toBe(5_000n);
    expect(second.freeQuotaUsed).toBe(false);
    expect(second.reason).toBe('base-price');
  });

  it('requires holder balance to unlock free quota when threshold configured', async () => {
    const configWithThreshold: AppConfig = {
      ...baseConfig,
      tokenMint: 'TokenMint11111111111111111111111111111111',
      freeCallsPerWalletPerDay: 1,
      freeCallTokenThreshold: 1_000_000n,
    };

    const insufficient = new BalanceTokenPerksService(configWithThreshold, 900_000n);
    const missed = await insufficient.adjustPrice({
      basePriceAtomic: 5_000n,
      payer: 'wallet-free-threshold-miss',
    });
    expect(missed.priceAtomic).toBe(5_000n);
    expect(missed.freeQuotaUsed).toBe(false);
    expect(missed.discountApplied).toBe(false);
    expect(missed.reason).toBe('base-price');

    const sufficient = new BalanceTokenPerksService(configWithThreshold, 1_500_000n);
    const first = await sufficient.adjustPrice({
      basePriceAtomic: 5_000n,
      payer: 'wallet-free-threshold-hit',
    });
    expect(first.priceAtomic).toBe(0n);
    expect(first.freeQuotaUsed).toBe(true);
    expect(first.discountApplied).toBe(false);
    expect(first.reason).toBe('free-quota');

    const second = await sufficient.adjustPrice({
      basePriceAtomic: 5_000n,
      payer: 'wallet-free-threshold-hit',
    });
    expect(second.priceAtomic).toBe(5_000n);
    expect(second.freeQuotaUsed).toBe(false);
    expect(second.discountApplied).toBe(false);
    expect(second.reason).toBe('base-price');
  });

  it('applies holder discount when eligible', async () => {
    const service = new TestTokenPerksService(
      {
        ...baseConfig,
        tokenMint: 'TokenMint11111111111111111111111111111111',
        freeCallsPerWalletPerDay: 0,
      },
      0
    );

    service.setDiscount(2_500);

    const result = await service.adjustPrice({
      basePriceAtomic: 10_000n,
      payer: 'wallet2',
    });

    expect(result.priceAtomic).toBe(7_500n);
    expect(result.discountApplied).toBe(true);
    expect(result.reason).toBe('holder-discount');
  });

  it('retries RPC failures before applying a discount', async () => {
    const threshold = 2_000_000n;
    const service = new RetryTokenPerksService(
      {
        ...baseConfig,
        tokenMint: 'TokenMint11111111111111111111111111111111',
        tokenHolderThreshold: threshold,
        holderDiscountBps: 2_500,
        freeCallsPerWalletPerDay: 0,
      },
      threshold,
      2
    );

    const result = await service.adjustPrice({
      basePriceAtomic: 10_000n,
      payer: 'wallet-retry',
    });

    expect(service.attempts).toBe(3);
    expect(service.delays).toEqual([75, 150]);
    expect(result.discountApplied).toBe(true);
    expect(result.priceAtomic).toBe(7_500n);
    expect(result.reason).toBe('holder-discount');
  });

  it('skips discount when all RPC retries fail', async () => {
    const service = new RetryTokenPerksService(
      {
        ...baseConfig,
        tokenMint: 'TokenMint11111111111111111111111111111111',
        tokenHolderThreshold: 1n,
        holderDiscountBps: 2_500,
        freeCallsPerWalletPerDay: 0,
      },
      10_000n,
      4
    );

    const result = await service.adjustPrice({
      basePriceAtomic: 10_000n,
      payer: 'wallet-retry-fail',
    });

    expect(service.attempts).toBe(4);
    expect(service.delays).toEqual([75, 150, 300]);
    expect(result.discountApplied).toBe(false);
    expect(result.priceAtomic).toBe(10_000n);
    expect(result.reason).toBe('base-price');
  });

  it('applies holder discount only when balance meets threshold', async () => {
    const configWithDiscount: AppConfig = {
      ...baseConfig,
      tokenMint: 'TokenMint11111111111111111111111111111111',
      freeCallsPerWalletPerDay: 0,
      freeCallTokenThreshold: 1_000_000n,
    };

    const belowThreshold = new BalanceTokenPerksService(configWithDiscount, 1_500_000n);
    const noDiscount = await belowThreshold.adjustPrice({
      basePriceAtomic: 12_000n,
      payer: 'wallet-discount-miss',
    });
    expect(noDiscount.priceAtomic).toBe(12_000n);
    expect(noDiscount.discountApplied).toBe(false);
    expect(noDiscount.reason).toBe('base-price');

    const qualifies = new BalanceTokenPerksService(configWithDiscount, 2_500_000n);
    const discounted = await qualifies.adjustPrice({
      basePriceAtomic: 12_000n,
      payer: 'wallet-discount-hit',
    });
    expect(discounted.priceAtomic).toBe(9_000n);
    expect(discounted.discountApplied).toBe(true);
    expect(discounted.reason).toBe('holder-discount');
  });
});
