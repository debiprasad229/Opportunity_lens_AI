import { describe, it, expect } from 'vitest';
import { evidenceVerifier } from '../../src/services/evidenceVerifier.js';
import { InternshipOpportunity } from '../../../shared/types.js';
import { ExtractedContent } from '../../src/services/htmlExtractor.js';

describe('EvidenceVerifier', () => {
  const dummyContent: ExtractedContent = {
    title: 'Frontend Intern - Stripe',
    cleanText: 'Stripe is looking for a Frontend Intern in Dublin. The monthly stipend is €3,500. Deadline to apply is December 15, 2025. Requirements: B.S. in Computer Science graduating in 2026.',
    jsonLdJobs: [],
    candidateApplyLinks: ['https://stripe.com/jobs/apply'],
    individualVacancyLinks: [],
    isIndexPage: false,
    tablesText: [],
    headings: ['Frontend Intern - Stripe'],
  };

  it('should mark fields as verified when exact source quote is grounded in text', () => {
    const opp: InternshipOpportunity = {
      id: 'test-1',
      companyName: {
        value: 'Stripe',
        status: 'unverified',
        sourceText: 'Stripe is looking for a Frontend Intern',
      },
      roleTitle: {
        value: 'Frontend Intern',
        status: 'unverified',
        sourceText: 'Frontend Intern in Dublin',
      },
      eligibility: {
        value: 'B.S. in Computer Science graduating in 2026',
        status: 'unverified',
        sourceText: 'Requirements: B.S. in Computer Science graduating in 2026.',
      },
      stipend: {
        value: '€3,500',
        status: 'unverified',
        sourceText: 'monthly stipend is €3,500',
      },
      deadline: {
        value: 'December 15, 2025',
        status: 'unverified',
        sourceText: 'Deadline to apply is December 15, 2025',
      },
      officialApplicationLink: {
        value: 'https://stripe.com/jobs/apply',
        status: 'unverified',
      },
      sourceDomain: 'stripe.com',
      sourceUrl: 'https://stripe.com/jobs/frontend-intern',
      overallScore: 50,
      discoveredAt: new Date().toISOString(),
      summary: 'Frontend Intern at Stripe',
    };

    const verified = evidenceVerifier.verify(opp, dummyContent);

    expect(verified.companyName.status).toBe('verified');
    expect(verified.roleTitle.status).toBe('verified');
    expect(verified.stipend.status).toBe('verified');
    expect(verified.deadline.status).toBe('verified');
    expect(verified.eligibility.status).toBe('verified');
    expect(verified.officialApplicationLink.status).toBe('verified');
  });

  it('should mark fields as unknown if value is missing', () => {
    const opp: InternshipOpportunity = {
      id: 'test-2',
      companyName: { value: 'Stripe', status: 'unverified' },
      roleTitle: { value: 'Frontend Intern', status: 'unverified' },
      eligibility: { value: null, status: 'unverified' },
      stipend: { value: null, status: 'unverified' },
      deadline: { value: null, status: 'unverified' },
      officialApplicationLink: { value: 'https://stripe.com', status: 'unverified' },
      sourceDomain: 'stripe.com',
      sourceUrl: 'https://stripe.com/jobs',
      overallScore: 0,
      discoveredAt: new Date().toISOString(),
      summary: 'Test',
    };

    const verified = evidenceVerifier.verify(opp, dummyContent);
    expect(verified.stipend.status).toBe('unknown');
    expect(verified.deadline.status).toBe('unknown');
    expect(verified.eligibility.status).toBe('unknown');
  });
});
