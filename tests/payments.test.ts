import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const verifyPaymentMock = vi.fn();
const settlePaymentMock = vi.fn();
const createPaymentRequirementsMock = vi.fn();

vi.mock('@payai/x402-solana/server', () => {
  return {
    X402PaymentHandler: vi.fn().mockImplementation(() => ({
      verifyPayment: verifyPaymentMock,
      settlePayment: settlePaymentMock,
      createPaymentRequirements: createPaymentRequirementsMock,
    })),
  };
});

import { PayAiSolanaPayments, type PaymentRequirements } from '../src/lib/payments.js';
import type { AppConfig } from '../src/config.js';
import type { Logger } from '../src/lib/logger.js';

const config: AppConfig = {
  adminApiKey: 'test-key',
  defaultPriceUsd: 0.005,
  priceDecimals: 6,
  facilitatorUrl: 'https://facilitator.payai.network',
  merchantAddress: 'Dkin4KKuoCSbMjudt8RpE1YuZ7gqs8aAYVS1fWPiat2W',
  network: 'solana',
  usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  tokenMint: 'HsnyqiEdMVn9qsJaj4EsE4WmEN6eih6zhK6c4TjBpump',
  tokenHolderThreshold: BigInt(2_000_000),
  holderDiscountBps: 2500,
  freeCallsPerWalletPerDay: 5,
  freeCallTokenThreshold: BigInt(1_000_000),
  solanaRpcUrl: 'https://rpc.example.com',
  rpcMetricsUrl: undefined,
  rpcMetricsAuthHeader: undefined,
  analyticsSinkUrl: undefined,
  analyticsSinkAuthHeader: undefined,
  analyticsSinkDatabase: undefined,
  analyticsSinkTable: undefined,
};

const logger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function buildExactPaymentHeader(requirements: PaymentRequirements) {
  const owner = Keypair.generate();
  const mint = new PublicKey(requirements.asset);
  const payTo = new PublicKey(requirements.payTo);
  const ownerAta = getAssociatedTokenAddressSync(mint, owner.publicKey);
  const merchantAta = getAssociatedTokenAddressSync(mint, payTo);

  const transferData = Buffer.alloc(9);
  transferData.writeUInt8(3, 0); // SPL Token Transfer instruction
  const amount = BigInt(requirements.maxAmountRequired);
  transferData.writeBigUInt64LE(amount, 1);

  const transferInstruction = new TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: ownerAta, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: merchantAta, isSigner: false, isWritable: true },
      { pubkey: owner.publicKey, isSigner: true, isWritable: false },
    ],
    data: transferData,
  });

  const transaction = new Transaction();
  transaction.recentBlockhash = Keypair.generate().publicKey.toBase58();
  transaction.feePayer = owner.publicKey;
  transaction.add(transferInstruction);
  transaction.sign(owner);

  const payload = {
    x402Version: 1,
    scheme: 'exact',
    network: requirements.network,
    payload: {
      transaction: Buffer.from(
        transaction.serialize({ requireAllSignatures: true, verifySignatures: true })
      ).toString('base64'),
    },
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

describe('PayAiSolanaPayments.verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const requirements: PaymentRequirements = {
    scheme: 'exact',
    network: 'solana',
    asset: config.usdcMint,
    payTo: config.merchantAddress,
    maxAmountRequired: '5000',
    resource: 'https://sol402.app/p/demo',
    mimeType: 'application/json',
    description: 'demo',
  };

  it('returns payai success when handler verifies the receipt', async () => {
    verifyPaymentMock.mockResolvedValueOnce(true);
    const payments = new PayAiSolanaPayments(config, { logger });

    const result = await payments.verify('original-header', requirements, {
      fallbackHeader: 'fallback',
    });

    expect(result).toEqual({
      ok: true,
      receipt: 'original-header',
      settleWithPayAi: true,
    });
    expect(verifyPaymentMock).toHaveBeenCalledWith('original-header', requirements);
  });

  it('falls back to local verification when PayAI rejects the transaction', async () => {
    verifyPaymentMock.mockResolvedValueOnce(false);
    const payments = new PayAiSolanaPayments(config, { logger });

    const fallbackHeader = buildExactPaymentHeader(requirements);
    const result = await payments.verify('original-header', requirements, {
      fallbackHeader,
    });

    expect(result.ok).toBe(true);
    expect(result.settleWithPayAi).toBe(false);
    expect(result.receipt).toBe(fallbackHeader);
    expect(logger.warn).toHaveBeenCalledWith('payai_verify_fallback_success', {});
  });

  it('returns failure when neither PayAI nor local verification succeed', async () => {
    verifyPaymentMock.mockResolvedValueOnce(false);
    const payments = new PayAiSolanaPayments(config, { logger });

    const result = await payments.verify('invalid', requirements, {
      fallbackHeader: 'invalid',
    });

    expect(result.ok).toBe(false);
    expect(result.receipt).toBeUndefined();
    expect(result.settleWithPayAi).toBe(false);
  });
});
