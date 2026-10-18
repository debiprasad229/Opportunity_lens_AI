import { describe, it, expect } from 'vitest';
import { isPrivateOrReservedIP, validateSafeUrl, SSRFError } from '../../src/utils/ssrfGuard.js';

describe('SSRF Guard', () => {
  it('should identify private and loopback IPv4 addresses', () => {
    expect(isPrivateOrReservedIP('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIP('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIP('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIP('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIP('192.168.1.1')).toBe(true);
  });

  it('should identify AWS/GCP cloud metadata IP', () => {
    expect(isPrivateOrReservedIP('169.254.169.254')).toBe(true);
  });

  it('should identify loopback and unique-local IPv6 addresses', () => {
    expect(isPrivateOrReservedIP('::1')).toBe(true);
    expect(isPrivateOrReservedIP('fc00::1')).toBe(true);
  });

  it('should allow public routable IP addresses', () => {
    expect(isPrivateOrReservedIP('8.8.8.8')).toBe(false);
    expect(isPrivateOrReservedIP('1.1.1.1')).toBe(false);
  });

  it('should reject invalid or forbidden protocols', async () => {
    await expect(validateSafeUrl('file:///etc/passwd')).rejects.toThrow(SSRFError);
    await expect(validateSafeUrl('ftp://example.com/file')).rejects.toThrow(SSRFError);
    await expect(validateSafeUrl('gopher://example.com')).rejects.toThrow(SSRFError);
  });

  it('should reject localhost hostnames', async () => {
    await expect(validateSafeUrl('http://localhost:8080')).rejects.toThrow(SSRFError);
    await expect(validateSafeUrl('http://internal.service.local')).rejects.toThrow(SSRFError);
  });

  it('should accept valid public URLs', async () => {
    const url = await validateSafeUrl('https://example.com');
    expect(url.hostname).toBe('example.com');
  });
});
