import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';
import { URL } from 'url';

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFError';
  }
}

/**
 * Checks whether an IP address is considered private, loopback, link-local,
 * carrier-grade NAT, or metadata IP.
 */
export function isPrivateOrReservedIP(ipString: string): boolean {
  try {
    const addr = ipaddr.parse(ipString);
    const range = addr.range();

    // Dangerous ranges for IPv4 and IPv6
    const blockedRanges = [
      'loopback',
      'private',
      'linkLocal',
      'carrierGradeNat',
      'broadcast',
      'multicast',
      'reserved',
      'uniqueLocal', // IPv6 fc00::/7
    ];

    if (blockedRanges.includes(range)) {
      return true;
    }

    // Specific block for cloud metadata IP: 169.254.169.254
    if (addr.kind() === 'ipv4' && addr.toString() === '169.254.169.254') {
      return true;
    }

    return false;
  } catch {
    // If it cannot be parsed as a valid IP, treat as unsafe
    return true;
  }
}

/**
 * Validates a target URL against SSRF attacks:
 * 1. Must be http: or https:
 * 2. Hostname must not resolve to any private/internal/cloud-metadata IP
 */
export async function validateSafeUrl(rawUrl: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new SSRFError(`Invalid URL format: ${rawUrl}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new SSRFError(`Forbidden protocol: ${parsedUrl.protocol}. Only http and https are allowed.`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Explicit blocklist for local hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254'
  ) {
    throw new SSRFError(`Access to internal or local hostname '${hostname}' is prohibited.`);
  }

  // If hostname is directly an IP address
  if (ipaddr.isValid(hostname)) {
    if (isPrivateOrReservedIP(hostname)) {
      throw new SSRFError(`Access to private/internal IP '${hostname}' is prohibited.`);
    }
    return parsedUrl;
  }

  // Resolve DNS to verify all returned IPs
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      throw new SSRFError(`Failed to resolve DNS for '${hostname}'`);
    }

    for (const res of lookupResults) {
      if (isPrivateOrReservedIP(res.address)) {
        throw new SSRFError(`Hostname '${hostname}' resolves to prohibited IP '${res.address}'.`);
      }
    }
  } catch (err: any) {
    if (err instanceof SSRFError) throw err;
    throw new SSRFError(`DNS resolution error for '${hostname}': ${err.message}`);
  }

  return parsedUrl;
}
