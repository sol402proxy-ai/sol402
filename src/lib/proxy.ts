import {
  assertSafeHttpUrl,
  ensureAllowedMimeType,
  filterResponseHeaders,
  UnsafeOriginError,
  DisallowedMimeTypeError,
} from './security.js';

export { UnsafeOriginError, DisallowedMimeTypeError };

export async function proxyFetch(originUrl: string): Promise<Response> {
  const url = assertSafeHttpUrl(originUrl);
  const response = await fetch(url);
  ensureAllowedMimeType(response.headers.get('content-type'));
  return response;
}

export { filterResponseHeaders };
