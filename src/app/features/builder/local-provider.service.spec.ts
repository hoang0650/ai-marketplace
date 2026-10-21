import { normalizeLocalBaseUrl } from './local-provider.service';
import { newIdempotencyKey } from '../../services/idempotency';

describe('normalizeLocalBaseUrl', () => {
  it('accepts loopback http and strips trailing slashes', () => {
    expect(normalizeLocalBaseUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1');
    expect(normalizeLocalBaseUrl('http://127.0.0.1:1234/v1')).toBe('http://127.0.0.1:1234/v1');
    expect(normalizeLocalBaseUrl('http://[::1]:8080/v1')).toBe('http://[::1]:8080/v1');
  });

  it('accepts https anywhere', () => {
    expect(normalizeLocalBaseUrl('https://llm.lan.example/v1')).toBe('https://llm.lan.example/v1');
  });

  it('rejects plain http to non-loopback hosts and odd URLs', () => {
    expect(() => normalizeLocalBaseUrl('http://192.168.1.5:11434/v1')).toThrow();
    expect(() => normalizeLocalBaseUrl('http://user:pw@localhost:11434/v1')).toThrow();
    expect(() => normalizeLocalBaseUrl('file:///etc/passwd')).toThrow();
    expect(() => normalizeLocalBaseUrl('not a url')).toThrow();
  });
});

describe('newIdempotencyKey', () => {
  it('is unique and fits the API limit', () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(120);
    expect(a).toMatch(/^chk-[A-Za-z0-9-]+$/);
  });
});
