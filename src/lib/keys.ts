const HEX_TABLE = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, '0'));

interface ApiKeyOptions {
  prefix?: string;
  byteLength?: number;
}

export interface GeneratedApiKey {
  apiKey: string;
  hash: string;
  preview: string;
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function getCrypto(): Crypto {
  const cryptoGlobal = (globalThis as { crypto?: Crypto }).crypto;
  if (!cryptoGlobal?.getRandomValues || !cryptoGlobal?.subtle) {
    throw new Error('Web Crypto APIs are required for key generation.');
  }
  return cryptoGlobal;
}

function bytesToHex(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 1) {
    output += HEX_TABLE[bytes[i]]!;
  }
  return output;
}

export async function generateApiKey(options: ApiKeyOptions = {}): Promise<GeneratedApiKey> {
  const crypto = getCrypto();
  const byteLength = Math.max(16, options.byteLength ?? 24);
  const randomBytes = new Uint8Array(byteLength);
  crypto.getRandomValues(randomBytes);

  const rawKey = bytesToHex(randomBytes);
  const prefix = options.prefix ? `${options.prefix}-` : '';
  const apiKey = `${prefix}${rawKey}`;

  const encoder = new TextEncoder();
  const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
  const hashBytes = new Uint8Array(digestBuffer);
  const hash = bytesToHex(hashBytes);
  const preview = apiKey.slice(0, Math.min(10, apiKey.length)).toUpperCase();

  return {
    apiKey,
    hash,
    preview,
  };
}

export async function hashApiKey(apiKey: string): Promise<string> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
  const hashBytes = new Uint8Array(digestBuffer);
  return bytesToHex(hashBytes);
}

export async function verifyApiKey(apiKey: string, hashed: string): Promise<boolean> {
  const digest = await hashApiKey(apiKey);
  return constantTimeEquals(digest, hashed);
}
