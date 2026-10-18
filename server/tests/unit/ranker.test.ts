import { describe, it, expect } from 'vitest';
import { opportunityRanker } from '../../src/services/ranker.js';
import { InternshipOpportunity } from '../../../shared/types.js';

describe('OpportunityRanker', () => {
  it('should rank opportunities with more verified fields and keyword matches higher', () => {
    const oppA: InternshipOpportunity = {
      id: 'opp-a',
      companyName: { value: 'Google', status: 'verified' },
      roleTitle: { value: 'Software Engineering Intern', status: 'verified' },
      eligibility: { value: '2026 Batch', status: 'verified' },
      stipend: { value: '$8,000/mo', status: 'verified' },
      deadline: { value: 'Nov 2025', status: 'verified' },
      officialApplicationLink: { value: 'https://careers.google.com', status: 'verified' },
      sourceDomain: 'google.com',
      sourceUrl: 'https://careers.google.com',
      overallScore: 0,
      discoveredAt: new Date().toISOString(),
      summary: 'Google Software Engineering Intern for 2026 Batch',
      isStaleOrClosed: false,
    };

    const oppB: InternshipOpportunity = {
      id: 'opp-b',
      companyName: { value: 'Unknown', status: 'unverified' },
      roleTitle: { value: 'Intern', status: 'unverified' },
      eligibility: { value: null, status: 'unknown' },
      stipend: { value: null, status: 'unknown' },
      deadline: { value: null, status: 'unknown' },
      officialApplicationLink: { value: 'https://example.com', status: 'unverified' },
      sourceDomain: 'example.com',
      sourceUrl: 'https://example.com',
      overallScore: 0,
      discoveredAt: new Date().toISOString(),
      summary: 'Intern',
      isStaleOrClosed: false,
    };

    const ranked = opportunityRanker.rank([oppB, oppA], 'Software Engineering Intern 2026');
    expect(ranked[0].id).toBe('opp-a');
    expect(ranked[0].overallScore).toBeGreaterThan(ranked[1].overallScore);
  });
});
