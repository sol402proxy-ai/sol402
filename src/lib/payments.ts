import { X402PaymentHandler } from '@payai/x402-solana/server';
import { isSolanaNetwork } from '@payai/x402-solana/types';
import type { PaymentRequirements, RouteConfig } from 'x402/types';
import { ed25519 } from '@noble/curves/ed25519';
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';

import type { AppConfig } from '../config.js';
import type { Logger } from './logger.js';
import type { PaymentChallenge, PaymentChallengeAccept, PriceQuote } from '../types.js';

const X402_VERSION = 1;

export interface PaymentRequirementContext {
  requestUrl: string;
  quote: PriceQuote;
}

export interface PayAiSolanaPaymentsOptions {
  logger?: Logger;
}

export interface PaymentVerificationResult {
  ok: boolean;
  receipt?: string;
  settleWithPayAi: boolean;
}

export class PayAiSolanaPayments {
  private readonly handler: X402PaymentHandler;
  private readonly config: AppConfig;
  private readonly logger?: Logger;

  constructor(config: AppConfig, options: PayAiSolanaPaymentsOptions = {}) {
    if (!isSolanaNetwork(config.network)) {
      throw new Error(`Unsupported network "${config.network}" for SOL402 payments`);
    }

    this.config = config;
    this.logger = options.logger;
    this.handler = new X402PaymentHandler({
      network: config.network,
      treasuryAddress: config.merchantAddress,
      facilitatorUrl: config.facilitatorUrl,
      rpcUrl: config.solanaRpcUrl,
    });
  }

  normalizePaymentHeader(header: string, _requirements?: PaymentRequirements): string {
    try {
      const decoded = decodePaymentHeader(header);
      const transactionBase64 = decoded?.payload?.transaction;
      if (typeof transactionBase64 !== 'string') {
        return header;
      }

      const transactionBuffer = Buffer.from(transactionBase64, 'base64');
      let versionedTransaction: VersionedTransaction;
      try {
        versionedTransaction = VersionedTransaction.deserialize(transactionBuffer);
      } catch {
        return header;
      }

      if (versionedTransaction.version !== 0) {
        return header;
      }

      if (versionedTransaction.message.addressTableLookups.length > 0) {
        this.logger?.warn('normalize_payment_header_skipped_lookup', {});
        return header;
      }

      const legacyTransaction = convertToLegacyTransaction(versionedTransaction);
      const legacyBase64 = Buffer.from(
        legacyTransaction.serialize({ verifySignatures: false })
      ).toString('base64');
      const normalizedPayload = {
        ...decoded,
        payload: {
          ...decoded.payload,
          transaction: legacyBase64,
        },
      };
      return Buffer.from(JSON.stringify(normalizedPayload)).toString('base64');
    } catch (error) {
      this.logger?.error('normalize_payment_header_failed', {}, error as Error);
      return header;
    }
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

  async verify(
    header: string,
    requirements: PaymentRequirements,
    options: { fallbackHeader?: string } = {}
  ): Promise<PaymentVerificationResult> {
    const verified = await this.handler.verifyPayment(header, requirements);
    if (verified) {
      return {
        ok: true,
        receipt: header,
        settleWithPayAi: true,
      };
    }

    const fallbackHeader = options.fallbackHeader ?? header;
    const fallbackVerified = localVerifySolanaPayment(fallbackHeader, requirements, this.logger);
    if (fallbackVerified) {
      this.logger?.warn('payai_verify_fallback_success', {});
      return {
        ok: true,
        receipt: fallbackHeader,
        settleWithPayAi: false,
      };
    }

    return {
      ok: false,
      settleWithPayAi: false,
    };
  }

  async settle(header: string, requirements: PaymentRequirements): Promise<boolean> {
    return this.handler.settlePayment(header, requirements);
  }
}

export type { PaymentRequirements };

interface PaymentHeaderPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    transaction: string;
  };
}

function decodePaymentHeader(header: string): PaymentHeaderPayload {
  const raw = Buffer.from(header, 'base64').toString('utf8');
  return JSON.parse(raw) as PaymentHeaderPayload;
}

function convertToLegacyTransaction(versioned: VersionedTransaction): Transaction {
  const message = versioned.message;
  const accountKeys = message.staticAccountKeys.map((key) => new PublicKey(key));
  const legacy = new Transaction();
  legacy.recentBlockhash = message.recentBlockhash;
  legacy.feePayer = accountKeys[0];

  message.compiledInstructions.forEach((compiled) => {
    const keys = compiled.accountKeyIndexes.map((index) => ({
      pubkey: accountKeys[index],
      isSigner: message.isAccountSigner(index),
      isWritable: message.isAccountWritable(index),
    }));
    const instruction = new TransactionInstruction({
      programId: accountKeys[compiled.programIdIndex],
      keys,
      data: Buffer.from(compiled.data),
    });
    legacy.add(instruction);
  });

  const signerKeys = accountKeys.slice(0, message.header.numRequiredSignatures);
  legacy.signatures = signerKeys.map((pubkey, index) => {
    const signatureBytes = Buffer.from(versioned.signatures[index]);
    const hasSignature = signatureBytes.some((byte) => byte !== 0);
    return {
      publicKey: pubkey,
      signature: hasSignature ? signatureBytes : null,
    };
  });

  return legacy;
}

function localVerifySolanaPayment(
  header: string,
  requirements: PaymentRequirements,
  logger?: Logger
): boolean {
  try {
    const payload = decodePaymentHeader(header);
    if (payload.scheme !== 'exact' || payload.network !== requirements.network) {
      return false;
    }

    const transactionBytes = Buffer.from(payload.payload.transaction, 'base64');
    const transaction = Transaction.from(transactionBytes);
    const instructions = transaction.instructions;
    const transferInstruction = instructions.find(
      (ix) =>
        ix.programId.equals(TOKEN_PROGRAM_ID) || ix.programId.equals(TOKEN_2022_PROGRAM_ID)
    );

    if (!transferInstruction) {
      return false;
    }

    const amountBuffer = transferInstruction.data.subarray(1, 9);
    if (amountBuffer.length !== 8) {
      return false;
    }
    const amount = amountBuffer.readBigUInt64LE(0);
    const maxAmount = BigInt(requirements.maxAmountRequired);
    if (amount !== maxAmount) {
      return false;
    }

    const tokenProgram = transferInstruction.programId.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    if (transferInstruction.keys.length < 4) {
      return false;
    }
    const sourceMeta = transferInstruction.keys[0];
    const mintMeta = transferInstruction.keys[1];
    const destinationMeta = transferInstruction.keys[2];
    const ownerMeta = transferInstruction.keys[3];

    if (!mintMeta.pubkey.equals(new PublicKey(requirements.asset))) {
      return false;
    }

    const expectedDestinationAta = getAssociatedTokenAddressSync(
      mintMeta.pubkey,
      new PublicKey(requirements.payTo),
      false,
      tokenProgram
    );
    if (!destinationMeta.pubkey.equals(expectedDestinationAta)) {
      return false;
    }

    const expectedSourceAta = getAssociatedTokenAddressSync(
      mintMeta.pubkey,
      ownerMeta.pubkey,
      false,
      tokenProgram
    );
    if (!sourceMeta.pubkey.equals(expectedSourceAta)) {
      return false;
    }

    const ownerSignature = transaction.signatures.find((sig) =>
      sig.publicKey.equals(ownerMeta.pubkey)
    );
    if (!ownerSignature?.signature) {
      return false;
    }

    const messageBytes = transaction.serializeMessage();
    const isValidSignature = ed25519.verify(
      ownerSignature.signature,
      messageBytes,
      ownerMeta.pubkey.toBytes()
    );
    if (!isValidSignature) {
      return false;
    }

    logger?.debug('local_payment_verification_passed', {
      owner: ownerMeta.pubkey.toBase58(),
      payTo: requirements.payTo,
      amount: amount.toString(),
    });
    return true;
  } catch (error) {
    logger?.error('local_payment_verification_failed', { message: (error as Error).message });
    return false;
  }
}
