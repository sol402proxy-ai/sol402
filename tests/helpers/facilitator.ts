const FACILITATOR_URL = 'https://facilitator.test';
const FEE_PAYER = 'FeePayer11111111111111111111111111111111';

export { FACILITATOR_URL, FEE_PAYER };

export interface FacilitatorMockOptions {
  originResponse?: (url: string) => Response;
  verifyValid?: boolean;
  settleSuccess?: boolean;
}

export function createFacilitatorFetchHandler(options: FacilitatorMockOptions = {}) {
  const { originResponse, verifyValid = true, settleSuccess = true } = options;

  return async (input: unknown, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as { url?: string } | undefined)?.url ?? '';

    if (url === `${FACILITATOR_URL}/supported`) {
      return new Response(
        JSON.stringify({
          kinds: [
            {
              scheme: 'exact',
              network: 'solana',
              extra: { feePayer: FEE_PAYER },
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    if (url === `${FACILITATOR_URL}/verify`) {
      return new Response(
        JSON.stringify({ isValid: verifyValid }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    if (url === `${FACILITATOR_URL}/settle`) {
      return new Response(
        JSON.stringify({ success: settleSuccess }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    }

    if (originResponse && url.startsWith('https://example.com/')) {
      return originResponse(url);
    }

    throw new Error(`Unhandled fetch request: ${url}`);
  };
}

export function createEncodedPaymentHeader(): string {
  const payload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'solana',
    payload: {
      signature: '0x' + 'a'.repeat(128),
      authorization: {
        from: 'From111111111111111111111111111111111111111',
        to: 'To11111111111111111111111111111111111111111',
        value: '1000',
        validAfter: '0',
        validBefore: '9999999999',
        nonce: '0x' + 'b'.repeat(64),
      },
    },
  };

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}
