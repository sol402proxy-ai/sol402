interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

export interface RateLimiterOptions {
  capacity: number;
  refillRate: number; // tokens per interval
  refillIntervalMs: number;
}

export class TokenBucketRateLimiter {
  private readonly buckets = new Map<string, BucketState>();
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillIntervalMs: number;

  constructor(options: RateLimiterOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.refillIntervalMs = options.refillIntervalMs;
  }

  consume(key: string, tokens = 1): boolean {
    const now = Date.now();
    const bucket = this.getBucket(key);
    this.refill(bucket, now);

    if (bucket.tokens < tokens) {
      return false;
    }

    bucket.tokens -= tokens;
    return true;
  }

  private getBucket(key: string): BucketState {
    const existing = this.buckets.get(key);
    if (existing) {
      return existing;
    }
    const bucket: BucketState = {
      tokens: this.capacity,
      lastRefillMs: Date.now(),
    };
    this.buckets.set(key, bucket);
    return bucket;
  }

  private refill(bucket: BucketState, nowMs: number) {
    const elapsed = nowMs - bucket.lastRefillMs;
    if (elapsed <= 0) {
      return;
    }
    const intervals = Math.floor(elapsed / this.refillIntervalMs);
    if (intervals <= 0) {
      return;
    }

    const tokensToAdd = intervals * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefillMs = nowMs;
  }
}
