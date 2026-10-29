import { describe, expect, it } from 'vitest';
import { checkClaim, parsePrices } from './verifier';
import { decodeBingUrl, isPublicWebUrl } from '../executor/websearch';

describe('price parsing on real pages', () => {
  it('reads thousands separators and decimals', () => {
    expect(parsePrices('Enterprise from $2,000 per month')).toEqual([2000]);
    expect(parsePrices('Pro: $20/mo, Max: $1,250.50')).toEqual([20, 1250.5]);
    expect(parsePrices('only $9,99 here')).toEqual([9.99]);
  });
  it('a $2,000 claim with a $2,000 quote passes, a wrong number still fails', () => {
    expect(checkClaim('Team plan $2,000 per month', { field: 'priceUsd', value: '2000', quote: 'Team plan $2,000 per month' }).status).toBe('pass');
    expect(checkClaim('Team plan $2,000 per month', { field: 'priceUsd', value: '200', quote: 'Team plan $2,000 per month' }).status).toBe('fail');
  });
});

describe('open-web read gate', () => {
  it('accepts public http(s) sites only', () => {
    expect(isPublicWebUrl('https://www.anthropic.com/pricing')).toBe(true);
    for (const bad of ['http://localhost:4010/', 'http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.5/', 'http://192.168.1.1/', 'http://172.16.0.1/', 'http://[::1]/', 'http://2130706433/', 'file:///etc/passwd', 'javascript:alert(1)', 'https://user:pw@example.com/', 'https://intranet/', 'http://example.com:8080/', 'https://x.internal/']) {
      expect(isPublicWebUrl(bad), bad).toBe(false);
    }
  });
  it('decodes the search engine click-tracking address', () => {
    const target = 'https://claude.com/pricing';
    const enc = 'a1' + Buffer.from(target).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodeBingUrl(`https://www.bing.com/ck/a?!&&p=x&u=${enc}&ntb=1`)).toBe(target);
    expect(decodeBingUrl('https://www.bing.com/ck/a?u=a1bm90LWEtdXJs')).toBeNull();
  });
});
