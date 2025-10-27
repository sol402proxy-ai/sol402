import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const LINK_ID = process.env.SOL402_LINK_ID;
assert.ok(LINK_ID, 'Set SOL402_LINK_ID to the link identifier you want to exercise.');

const endpoint = `https://sol402.app/p/${LINK_ID}`;

const challengeResponse = await fetch(endpoint, {
  headers: {
    accept: 'application/json',
  },
});

if (challengeResponse.status !== 402) {
  throw new Error(`Expected 402 from paywall, got ${challengeResponse.status}`);
}

const challenge = await challengeResponse.json();

const accept = challenge?.accepts?.[0];
assert.ok(accept, 'challenge.accepts[0] missing');

const mintAddress = new PublicKey(accept.asset);
const merchant = new PublicKey(accept.payTo);
const amount = BigInt(accept.maxAmountRequired);

const owner = Keypair.generate();
const ownerAta = getAssociatedTokenAddressSync(mintAddress, owner.publicKey);
const merchantAta = getAssociatedTokenAddressSync(mintAddress, merchant);

const transferIx = createTransferCheckedInstruction(
  ownerAta,
  mintAddress,
  merchantAta,
  owner.publicKey,
  Number(amount),
  6,
  [],
  TOKEN_PROGRAM_ID
);

const tx = new Transaction();
tx.recentBlockhash = Keypair.generate().publicKey.toBase58();
tx.feePayer = owner.publicKey;
tx.add(transferIx);
tx.sign(owner);

const serialized = tx.serialize({
  requireAllSignatures: true,
  verifySignatures: true,
});

const paymentPayload = {
  x402Version: 1,
  scheme: 'exact',
  network: accept.network,
  payload: {
    transaction: Buffer.from(serialized).toString('base64'),
  },
};

const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

const paidResponse = await fetch(endpoint, {
  headers: {
    'x-payment': paymentHeader,
  },
});

console.log('Paid response status:', paidResponse.status);
console.log('Response headers:', Object.fromEntries(paidResponse.headers.entries()));
console.log('Body:', await paidResponse.text());
