import { describe, it, expect } from 'vitest';
import {
  canonicalizeUrl,
  isOfficialCareerPage,
  prioritizeSearchResults,
  searchProvider,
  SearchResultItem,
} from '../../src/services/searchProvider.js';

describe('SearchProvider & URL Management', () => {
  it('should canonicalize URLs and strip tracking query parameters', () => {
    const dirtyUrl = 'https://boards.greenhouse.io/acme/jobs/12345/?utm_source=linkedin&utm_medium=cpc&ref=job_board&trk=feed#apply';
    const cleanUrl = canonicalizeUrl(dirtyUrl);
    expect(cleanUrl).toBe('https://boards.greenhouse.io/acme/jobs/12345');
  });

  it('should trim trailing slashes while preserving root', () => {
    expect(canonicalizeUrl('https://example.com/careers/swe/')).toBe('https://example.com/careers/swe');
    expect(canonicalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('should identify official company career pages and ATS domains', () => {
    expect(isOfficialCareerPage('https://jobs.lever.co/stripe/123', 'jobs.lever.co')).toBe(true);
    expect(isOfficialCareerPage('https://boards.greenhouse.io/datadog/jobs/456', 'boards.greenhouse.io')).toBe(true);
    expect(isOfficialCareerPage('https://careers.google.com/jobs/results/789', 'careers.google.com')).toBe(true);
    expect(isOfficialCareerPage('https://amd.com/en/corporate/careers/jobs/101', 'amd.com')).toBe(true);
    expect(isOfficialCareerPage('https://randomforum.com/thread/123', 'randomforum.com')).toBe(false);
  });

  it('should prioritize official ATS and career pages over generic aggregators', () => {
    const items: SearchResultItem[] = [
      {
        title: 'Software Engineer Intern discussion',
        url: 'https://glassdoor.com/forum/swe-intern',
        snippet: 'Discussion forum',
        domain: 'glassdoor.com',
      },
      {
        title: 'Software Engineer Intern - Acme',
        url: 'https://boards.greenhouse.io/acme/jobs/101',
        snippet: 'Official application',
        domain: 'boards.greenhouse.io',
      },
      {
        title: 'Intern at Stripe',
        url: 'https://jobs.lever.co/stripe/intern',
        snippet: 'Apply now',
        domain: 'jobs.lever.co',
      },
    ];

    const prioritized = prioritizeSearchResults(items);
    expect(prioritized[0].domain).toMatch(/greenhouse\.io|lever\.co/);
    expect(prioritized[1].domain).toMatch(/greenhouse\.io|lever\.co/);
    expect(prioritized[2].domain).toBe('glassdoor.com');
  });

  it('should provide an active provider name via SearchProviderManager', () => {
    const activeName = searchProvider.getActiveProviderName();
    expect(activeName).toBeTruthy();
    expect(typeof activeName).toBe('string');
  });
});
