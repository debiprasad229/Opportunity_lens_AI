import { describe, it, expect } from 'vitest';
import { safePageFetcher } from '../../src/services/pageFetcher.js';
import { htmlExtractor } from '../../src/services/htmlExtractor.js';

describe('Real Public Web Page Verification', () => {
  it('should safely fetch an authentic live public website with SSRF guard and extract text', async () => {
    // Test against a known, stable public standard website
    const targetUrl = 'https://example.com';
    const fetched = await safePageFetcher.fetchPage(targetUrl);

    expect(fetched.statusCode).toBe(200);
    expect(fetched.success).toBe(true);
    expect(fetched.html).toContain('Example Domain');
    expect(fetched.isRestricted).toBe(false);

    // Verify HTML extractor parses real live HTML
    const extracted = htmlExtractor.extract(fetched.html, fetched.finalUrl);
    expect(extracted.title).toContain('Example Domain');
    expect(extracted.cleanText.length).toBeGreaterThan(20);
  }, 15000);
});
