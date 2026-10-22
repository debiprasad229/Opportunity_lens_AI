import { describe, it, expect } from 'vitest';
import {
  ExtractedOpportunitySchema,
  normalizeDateString,
  geminiAdapter,
} from '../../src/services/geminiAdapter.js';
import { ExtractedContent } from '../../src/services/htmlExtractor.js';

describe('GeminiAdapter Schema & Date Normalization', () => {
  it('should validate structured output against the strict Zod schema', () => {
    const validData = {
      isInternship: true,
      companyName: { value: 'Acme Corp', quote: 'Acme Corp is hiring' },
      roleTitle: { value: 'Software Engineer Intern', quote: 'Software Engineer Intern 2026' },
      eligibility: { value: 'Graduating in 2026', quote: 'Students graduating in 2026' },
      stipend: { value: '$45/hr', quote: 'Stipend: $45/hr' },
      deadline: { value: 'November 30, 2026', quote: 'Deadline: November 30, 2026', normalizedDate: '2026-11-30' },
      officialApplicationLink: { value: 'https://acme.com/apply', quote: 'Apply at https://acme.com/apply' },
      summary: 'Software engineering internship at Acme Corp.',
      isStaleOrClosed: false,
    };

    const parseResult = ExtractedOpportunitySchema.safeParse(validData);
    expect(parseResult.success).toBe(true);
  });

  it('should accept nulls for fields not mentioned on page', () => {
    const dataWithMissingFields = {
      isInternship: true,
      companyName: { value: 'Stripe', quote: 'Stripe Careers' },
      roleTitle: { value: 'SWE Intern', quote: 'SWE Intern' },
      eligibility: { value: null, quote: null },
      stipend: { value: null, quote: null },
      deadline: { value: null, quote: null },
      officialApplicationLink: { value: null, quote: null },
      summary: 'Stripe internship.',
      isStaleOrClosed: false,
    };

    const parseResult = ExtractedOpportunitySchema.safeParse(dataWithMissingFields);
    expect(parseResult.success).toBe(true);
  });

  it('should reject malformed data that violates schema types', () => {
    const invalidData = {
      isInternship: 'yes', // should be boolean
      companyName: 'Acme', // should be object with value and quote
    };

    const parseResult = ExtractedOpportunitySchema.safeParse(invalidData);
    expect(parseResult.success).toBe(false);
  });

  it('should normalize various date formats and preserve keywords', () => {
    expect(normalizeDateString('November 30, 2026')).toBe('2026-11-30');
    expect(normalizeDateString('2026-10-15')).toBe('2026-10-15');
    expect(normalizeDateString('Rolling basis')).toBe('rolling');
    expect(normalizeDateString('Open until filled')).toBe('rolling');
    expect(normalizeDateString('Apply ASAP')).toBe('asap');
    expect(normalizeDateString(null)).toBeUndefined();
  });

  it('should safely extract from authentic content using heuristic fallback', () => {
    const content: ExtractedContent = {
      title: 'Frontend Intern - Stripe - Summer 2026',
      cleanText: 'Frontend Intern - Stripe. Stipend: $50/hr. Eligibility: Enrolled in CS graduating in 2026. Deadline: December 1, 2026.',
      jsonLdJobs: [],
      candidateApplyLinks: ['https://stripe.com/apply/frontend'],
      individualVacancyLinks: [],
      isIndexPage: false,
      tablesText: [],
      headings: ['Frontend Intern', 'Stripe'],
    };

    const extracted = geminiAdapter.extractWithHeuristics(content, 'https://stripe.com/jobs/frontend');
    expect(extracted).not.toBeNull();
    expect(extracted!.companyName.value).toBe('Stripe');
    expect(extracted!.roleTitle.value).toContain('Frontend Intern');
    expect(extracted!.stipend.value).toBe('$50/hr');
    expect(extracted!.deadline.value).toContain('December 1, 2026');
    expect(extracted!.deadline.normalizedDate).toBe('2026-12-01');
  });
});
