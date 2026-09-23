import { describe, expect, test } from 'bun:test';
import { validateOutboundUrl } from '@/lib/url-safety';

describe('validateOutboundUrl', () => {
  test('blocks loopback and private IPv4 destinations', async () => {
    for (const url of [
      'http://127.0.0.1:5432',
      'http://10.0.0.5',
      'http://172.16.0.10',
      'http://192.168.1.10',
      'http://169.254.169.254/latest/meta-data',
    ]) {
      const result = await validateOutboundUrl(url);
      expect(result.safe).toBe(false);
    }
  });

  test('blocks local hostnames and unsupported protocols', async () => {
    expect((await validateOutboundUrl('http://localhost:3000')).safe).toBe(false);
    expect((await validateOutboundUrl('http://service.internal')).safe).toBe(false);
    expect((await validateOutboundUrl('file:///etc/passwd')).safe).toBe(false);
  });

  test('allows public HTTPS destinations', async () => {
    const result = await validateOutboundUrl('https://example.com');
    expect(result.safe).toBe(true);
  });
});
