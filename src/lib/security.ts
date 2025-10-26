import net from 'node:net';

export class UnsafeOriginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeOriginError';
  }
}

export class DisallowedMimeTypeError extends Error {
  constructor(mimeType: string | null) {
    super(`Origin responded with a disallowed MIME type: ${mimeType ?? 'unknown'}`);
    this.name = 'DisallowedMimeTypeError';
  }
}

const PRIVATE_HOSTS = new Set(['localhost', '127.0.0.1']);
const HEADER_ALLOWLIST = new Set([
  'content-type',
  'cache-control',
  'last-modified',
  'etag',
]);

const ALLOWED_MIME_PREFIXES = ['text/', 'image/'];
const ALLOWED_MIME_TYPES = new Set(['application/json', 'application/pdf']);

export function assertSafeHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeOriginError('Origin must be a valid absolute URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new UnsafeOriginError('Only HTTP and HTTPS protocols are allowed.');
  }

  const hostname = url.hostname.toLowerCase();

  if (PRIVATE_HOSTS.has(hostname)) {
    throw new UnsafeOriginError(`Hostname "${hostname}" is not allowed.`);
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new UnsafeOriginError(`IP address "${hostname}" is not reachable.`);
    }
  }

  return url;
}

export function ensureAllowedMimeType(contentType: string | null) {
  if (!contentType) {
    throw new DisallowedMimeTypeError(null);
  }

  const normalized = contentType.split(';')[0]?.trim().toLowerCase();
  if (!normalized) {
    throw new DisallowedMimeTypeError(contentType);
  }

  if (ALLOWED_MIME_TYPES.has(normalized)) {
    return;
  }

  if (ALLOWED_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return;
  }

  throw new DisallowedMimeTypeError(contentType);
}

export function filterResponseHeaders(headers: Headers): Headers {
  const filtered = new Headers();
  headers.forEach((value, key) => {
    if (HEADER_ALLOWLIST.has(key.toLowerCase())) {
      filtered.set(key, value);
    }
  });
  return filtered;
}

function isPrivateIp(ip: string): boolean {
  const segments = ip.split('.').map((segment) => Number.parseInt(segment, 10));
  if (segments.length !== 4 || segments.some((segment) => Number.isNaN(segment))) {
    return false;
  }

  const [a, b] = segments;

  // 10.0.0.0/8
  if (a === 10) {
    return true;
  }

  // 172.16.0.0 – 172.31.255.255
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  // 192.168.0.0/16
  if (a === 192 && b === 168) {
    return true;
  }

  // 127.x.x.x loopback (already caught by PRIVATE_HOSTS but redundant guard)
  if (a === 127) {
    return true;
  }

  // Link-local 169.254.0.0/16
  if (a === 169 && b === 254) {
    return true;
  }

  return false;
}
