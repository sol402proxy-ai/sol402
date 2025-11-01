import { getAssociatedTokenAddress } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import type { AppConfig } from '../config.js';
import type { Logger } from './logger.js';
import type { MetricsPublisher } from './metrics-publisher.js';

interface BalanceCacheEntry {
  balance: bigint;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  fetchedAt: number;
  expiresAt: number;
}

type BalanceFetchResult = Omit<BalanceCacheEntry, 'expiresAt'>;

export interface HolderBalanceDetails {
  balance: bigint;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  refreshedAt: Date;
}

interface TokenServiceOptions {
  connection?: Connection;
  cacheTtlMs?: number;
  logger?: Logger;
  maxRpcAttempts?: number;
  retryBackoffMs?: number;
  metricsPublisher?: MetricsPublisher;
  rpcEndpoint?: string;
}

interface PriceAdjustmentArgs {
  basePriceAtomic: bigint;
  payer?: string;
  now?: Date;
}

export interface PriceAdjustmentResult {
  priceAtomic: bigint;
  reason: string;
  discountApplied: boolean;
  freeQuotaUsed: boolean;
}

interface QuotaState {
  dateKey: string;
  count: number;
}

const DEFAULT_CACHE_TTL_MS = 30_000;
const BASIS_POINTS_DIVISOR = 10_000;

export class TokenPerksService {
  private readonly config: AppConfig;
  private readonly connection?: Connection;
  private readonly logger?: Logger;
  private readonly cacheTtlMs: number;
  private readonly balanceCache = new Map<string, BalanceCacheEntry>();
  private readonly quotaUsage = new Map<string, QuotaState>();
  private readonly maxRpcAttempts: number;
  private readonly retryBackoffMs: number;
  private readonly metricsPublisher?: MetricsPublisher;
  private readonly rpcEndpoint?: string;

  constructor(config: AppConfig, options: TokenServiceOptions = {}) {
    this.config = config;
    this.connection = options.connection;
    this.logger = options.logger;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.maxRpcAttempts = Math.max(1, options.maxRpcAttempts ?? 3);
    this.retryBackoffMs = Math.max(0, options.retryBackoffMs ?? 150);
    this.metricsPublisher = options.metricsPublisher;
    this.rpcEndpoint = options.rpcEndpoint ?? config.solanaRpcUrl;
  }

  supportsBalanceChecks(): boolean {
    return Boolean(this.connection && this.config.tokenMint);
  }

  async getHolderBalance(owner: string, options: { fresh?: boolean } = {}): Promise<bigint> {
    if (!this.supportsBalanceChecks()) {
      throw new Error('Token balance checks require a configured Solana connection and mint.');
    }

    if (options.fresh) {
      this.balanceCache.delete(owner);
    }

    const entry = await this.getCachedBalance(owner);
    return entry.balance;
  }

  async getHolderBalanceDetails(
    owner: string,
    options: { fresh?: boolean } = {}
  ): Promise<HolderBalanceDetails> {
    if (!this.supportsBalanceChecks()) {
      throw new Error('Token balance checks require a configured Solana connection and mint.');
    }

    if (options.fresh) {
      this.balanceCache.delete(owner);
    }

    const entry = await this.getCachedBalance(owner);
    return {
      balance: entry.balance,
      decimals: entry.decimals,
      uiAmount: entry.uiAmount,
      uiAmountString: entry.uiAmountString,
      refreshedAt: new Date(entry.fetchedAt),
    };
  }

  async adjustPrice(args: PriceAdjustmentArgs): Promise<PriceAdjustmentResult> {
    const { basePriceAtomic, payer, now = new Date() } = args;
    let holderBalance: bigint | undefined;
    let holderBalanceError: unknown;

    if (basePriceAtomic <= 0n) {
      return {
        priceAtomic: 0n,
        reason: 'no-charge',
        discountApplied: false,
        freeQuotaUsed: false,
      };
    }

    if (!payer) {
      return {
        priceAtomic: basePriceAtomic,
        reason: 'base-price',
        discountApplied: false,
        freeQuotaUsed: false,
      };
    }

    const freeQuotaEnabled = this.config.freeCallsPerWalletPerDay > 0;
    const freeCallThreshold = this.config.freeCallTokenThreshold;

    if (freeQuotaEnabled) {
      let eligibleForFreeCalls = false;

      if (freeCallThreshold <= 0n) {
        eligibleForFreeCalls = true;
      } else if (!this.config.tokenMint) {
        this.logger?.debug('No token mint configured; skipping free-call threshold check.');
      } else if (!this.connection) {
        this.logger?.debug('No Solana connection configured; skipping free-call threshold check.');
      } else {
        try {
          holderBalance = (await this.getCachedBalance(payer)).balance;
          eligibleForFreeCalls = holderBalance >= freeCallThreshold;
        } catch (error) {
          holderBalanceError = error;
          this.logger?.warn('Failed to fetch SPL balance; skipping free-call quota.', {
            payer,
            attempts: this.maxRpcAttempts,
          });
          this.logger?.debug('Free-call balance error detail', { error });
        }
      }

      if (eligibleForFreeCalls && this.useFreeQuota(payer, now)) {
        return {
          priceAtomic: 0n,
          reason: 'free-quota',
          discountApplied: false,
          freeQuotaUsed: true,
        };
      }
    }

    const discountBps =
      holderBalanceError !== undefined
        ? 0
        : await this.shouldApplyHolderDiscount(payer, holderBalance);
    if (discountBps > 0) {
      const discounted = this.applyDiscount(basePriceAtomic, discountBps);
      return {
        priceAtomic: discounted,
        reason: 'holder-discount',
        discountApplied: true,
        freeQuotaUsed: false,
      };
    }

    return {
      priceAtomic: basePriceAtomic,
      reason: 'base-price',
      discountApplied: false,
      freeQuotaUsed: false,
    };
  }

  private useFreeQuota(payer: string, now: Date): boolean {
    const limit = this.config.freeCallsPerWalletPerDay;
    if (limit <= 0) {
      return false;
    }

    const dateKey = now.toISOString().slice(0, 10);
    const state = this.quotaUsage.get(payer);

    if (!state || state.dateKey !== dateKey) {
      this.quotaUsage.set(payer, { dateKey, count: 1 });
      return true;
    }

    if (state.count >= limit) {
      return false;
    }

    state.count += 1;
    return true;
  }

  protected async shouldApplyHolderDiscount(payer: string, holderBalance?: bigint): Promise<number> {
    const discountBps = this.config.holderDiscountBps;
    const threshold = this.config.tokenHolderThreshold;
    if (!this.config.tokenMint || discountBps <= 0 || threshold <= 0n) {
      return 0;
    }

    if (!this.connection) {
      this.logger?.debug('No Solana connection configured; skipping holder discount.');
      return 0;
    }

    try {
      const balance = holderBalance ?? (await this.getCachedBalance(payer)).balance;
      return balance >= threshold ? discountBps : 0;
    } catch (error) {
      this.logger?.warn('Failed to fetch SPL balance; skipping discount.', {
        payer,
        attempts: this.maxRpcAttempts,
      });
      this.logger?.debug('Balance fetch error detail', { error });
      return 0;
    }
  }

  private async getCachedBalance(owner: string): Promise<BalanceCacheEntry> {
    const now = Date.now();
    const cached = this.balanceCache.get(owner);
    if (cached && cached.expiresAt > now) {
      return cached;
    }

    const details = await this.fetchBalanceDetails(owner);
    const entry: BalanceCacheEntry = {
      ...details,
      expiresAt: now + this.cacheTtlMs,
    };
    this.balanceCache.set(owner, entry);
    return entry;
  }

  private async fetchBalanceDetails(owner: string): Promise<BalanceFetchResult> {
    if (!this.connection || !this.config.tokenMint) {
      const now = Date.now();
      return {
        balance: 0n,
        decimals: 0,
        uiAmount: 0,
        uiAmountString: '0',
        fetchedAt: now,
      };
    }

    let attempt = 0;
    let lastError: unknown;

    while (attempt < this.maxRpcAttempts) {
      attempt += 1;
      const attemptStart = Date.now();
      try {
        const details = await this.performBalanceFetch(owner);
        const durationMs = Date.now() - attemptStart;
        this.logger?.debug('SPL balance fetch success', {
          owner,
          attempt,
          durationMs,
          balance: details.balance.toString(),
        });
        this.emitRpcMetric({
          owner,
          attempt,
          durationMs,
          success: true,
        });
        return {
          ...details,
          fetchedAt: Date.now(),
        };
      } catch (error) {
        lastError = error;
        const durationMs = Date.now() - attemptStart;
        this.logger?.warn('SPL balance fetch failed', {
          owner,
          attempt,
          durationMs,
        });
        this.logger?.debug('SPL balance error detail', {
          owner,
          attempt,
          error,
        });
        this.emitRpcMetric({
          owner,
          attempt,
          durationMs,
          success: false,
        });
        if (attempt >= this.maxRpcAttempts) {
          break;
        }
        const delayMs = this.retryBackoffMs * 2 ** (attempt - 1);
        if (delayMs > 0) {
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError ?? new Error('Failed to fetch SPL balance');
  }

  protected async performBalanceFetch(owner: string): Promise<Omit<BalanceFetchResult, 'fetchedAt'>> {
    if (!this.connection || !this.config.tokenMint) {
      return {
        balance: 0n,
        decimals: 0,
        uiAmount: 0,
        uiAmountString: '0',
      };
    }

    const ownerKey = new PublicKey(owner);
    const mintKey = new PublicKey(this.config.tokenMint);
    const connection = this.connection;

    const ata = await getAssociatedTokenAddress(mintKey, ownerKey);
    const accountInfo = await connection.getAccountInfo(ata);

    if (!accountInfo) {
      return {
        balance: 0n,
        decimals: 0,
        uiAmount: 0,
        uiAmountString: '0',
      };
    }

    const account = await connection.getTokenAccountBalance(ata);
    const amount = BigInt(account.value.amount ?? '0');
    const decimals = account.value.decimals ?? 0;
    const decimalStringFromAmount = (): string => {
      if (amount === 0n || decimals <= 0) {
        return amount.toString();
      }
      const raw = amount.toString().padStart(decimals + 1, '0');
      const separatorIndex = raw.length - decimals;
      const integerPart = raw.slice(0, separatorIndex);
      const fractionalPart = raw.slice(separatorIndex).replace(/0+$/, '');
      return fractionalPart.length > 0 ? `${integerPart}.${fractionalPart}` : integerPart;
    };

    const uiAmount =
      typeof account.value.uiAmount === 'number'
        ? account.value.uiAmount
        : Number(decimalStringFromAmount());

    const uiAmountString =
      typeof account.value.uiAmountString === 'string'
        ? account.value.uiAmountString
        : decimalStringFromAmount();

    return {
      balance: amount,
      decimals,
      uiAmount: Number.isFinite(uiAmount) ? uiAmount : Number(decimalStringFromAmount()),
      uiAmountString,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  protected async sleep(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  protected applyDiscount(base: bigint, discountBps: number): bigint {
    const numerator = BigInt(BASIS_POINTS_DIVISOR - discountBps);
    const discounted = (base * numerator) / BigInt(BASIS_POINTS_DIVISOR);
    return discounted >= 0n ? discounted : 0n;
  }

  private emitRpcMetric(args: { owner: string; attempt: number; durationMs: number; success: boolean }) {
    if (!this.metricsPublisher) {
      return;
    }

    this.metricsPublisher.record({
      endpoint: this.rpcEndpoint,
      network: this.config.network,
      payer: args.owner,
      attempt: args.attempt,
      durationMs: args.durationMs,
      success: args.success,
      timestamp: Date.now(),
    });
  }
}
