import { describe, expect, it } from 'vitest';
import {
  assertSafeHttpUrl,
  ensureAllowedMimeType,
  filterResponseHeaders,
  DisallowedMimeTypeError,
  UnsafeOriginError,
} from '../../src/lib/security.js';

describe('security helpers', () => {
  it('allows valid http/https URLs', () => {
    const url = assertSafeHttpUrl('https://example.com/path?q=1');
    expect(url.hostname).toBe('example.com');
  });

  it('rejects private network origins', () => {
    expect(() => assertSafeHttpUrl('http://127.0.0.1:8000')).toThrow(UnsafeOriginError);
  });

  it('rejects non-http schemes', () => {
    expect(() => assertSafeHttpUrl('file:///etc/passwd')).toThrow(UnsafeOriginError);
  });

  it('allows common safe MIME types', () => {
    expect(() => ensureAllowedMimeType('application/json')).not.toThrow();
    expect(() => ensureAllowedMimeType('text/plain; charset=utf-8')).not.toThrow();
  });

  it('rejects disallowed MIME types', () => {
    expect(() => ensureAllowedMimeType('application/x-msdownload')).toThrow(
      DisallowedMimeTypeError
    );
  });

  it('filters response headers against the allowlist', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      'set-cookie': 'secret',
      'cache-control': 'no-store',
    });

    const filtered = filterResponseHeaders(headers);
    expect(filtered.get('content-type')).toBe('application/json');
    expect(filtered.get('cache-control')).toBe('no-store');
    expect(filtered.has('set-cookie')).toBe(false);
  });
});
