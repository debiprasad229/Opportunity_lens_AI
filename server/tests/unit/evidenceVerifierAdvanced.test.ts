import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { evidenceVerifier } from '../../src/services/evidenceVerifier.js';
import { htmlExtractor } from '../../src/services/htmlExtractor.js';
import { InternshipOpportunity } from '../../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('EvidenceVerifier Advanced Grounding', () => {
  it('should verify verbatim grounded fields against an authentic fixture page', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'company_career_detail.html'), 'utf-8');
    const content = htmlExtractor.extract(html, 'https://acme.careers/jobs/swe-intern-2026');

    const rawOpp: InternshipOpportunity = {
      id: 'test-1',
      companyName: {
        value: 'Acme Cloud Technologies',
        status: 'unverified',
        sourceText: 'Acme Cloud Technologies is hiring a Software Engineer Intern',
      },
      roleTitle: {
        value: 'Software Engineer Intern - Summer 2026',
        status: 'unverified',
        sourceText: 'Software Engineer Intern - Summer 2026',
      },
      eligibility: {
        value: 'graduating in 2026',
        status: 'unverified',
        sourceText: 'graduating in 2026',
      },
      stipend: {
        value: '$52 per hour',
        status: 'unverified',
        sourceText: 'Stipend: $52 per hour plus monthly housing stipend',
      },
      deadline: {
        value: 'November 30, 2026',
        status: 'unverified',
        sourceText: 'Application Deadline: November 30, 2026',
      },
      officialApplicationLink: {
        value: 'https://boards.greenhouse.io/acme/jobs/492019',
        status: 'unverified',
      },
      sourceDomain: 'acme.careers',
      sourceUrl: 'https://acme.careers/jobs/swe-intern-2026',
      overallScore: 50,
      discoveredAt: new Date().toISOString(),
      summary: 'Internship at Acme',
    };

    const verified = evidenceVerifier.verify(rawOpp, content);

    expect(verified.companyName.status).toBe('verified');
    expect(verified.companyName.confidenceScore).toBeGreaterThan(0.9);

    expect(verified.roleTitle.status).toBe('verified');
    expect(verified.eligibility.status).toBe('verified');
    expect(verified.stipend.status).toBe('verified');
    expect(verified.deadline.status).toBe('verified');
    expect(verified.deadline.normalizedDate).toBe('2026-11-30');
    expect(verified.officialApplicationLink.status).toBe('verified');
  });

  it('should mark completely ungrounded or fabricated quotes as unverified', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'company_career_detail.html'), 'utf-8');
    const content = htmlExtractor.extract(html, 'https://acme.careers/jobs/swe-intern-2026');

    const oppWithHallucination: InternshipOpportunity = {
      id: 'test-hallucination',
      companyName: {
        value: 'Acme Cloud Technologies',
        status: 'unverified',
      },
      roleTitle: {
        value: 'Software Engineer Intern',
        status: 'unverified',
      },
      eligibility: {
        value: 'PhD Only with 5 years experience',
        status: 'unverified',
        sourceText: 'Candidate must have a completed PhD and 5 years experience',
      },
      stipend: {
        value: '$200,000 annual bonus',
        status: 'unverified',
        sourceText: 'We pay $200,000 annual bonus to interns',
      },
      deadline: {
        value: 'Tomorrow',
        status: 'unverified',
        sourceText: 'Deadline is strictly tomorrow',
      },
      officialApplicationLink: {
        value: 'https://fake-link.com/scam',
        status: 'unverified',
      },
      sourceDomain: 'acme.careers',
      sourceUrl: 'https://acme.careers/jobs/swe-intern-2026',
      overallScore: 50,
      discoveredAt: new Date().toISOString(),
      summary: 'Test',
    };

    const verified = evidenceVerifier.verify(oppWithHallucination, content);

    expect(verified.eligibility.status).toBe('unverified');
    expect(verified.eligibility.confidenceScore).toBeLessThan(0.4);

    expect(verified.stipend.status).toBe('unverified');
    expect(verified.stipend.confidenceScore).toBeLessThan(0.4);

    expect(verified.deadline.status).toBe('unverified');
  });

  it('should honestly mark missing fields as unknown with null value', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'company_career_detail.html'), 'utf-8');
    const content = htmlExtractor.extract(html, 'https://acme.careers/jobs/swe-intern-2026');

    const oppMissingStipend: InternshipOpportunity = {
      id: 'test-missing',
      companyName: { value: 'Acme Cloud Technologies', status: 'unverified' },
      roleTitle: { value: 'Software Engineer Intern', status: 'unverified' },
      eligibility: { value: null, status: 'unknown' },
      stipend: { value: null, status: 'unknown' },
      deadline: { value: null, status: 'unknown' },
      officialApplicationLink: { value: 'https://acme.careers', status: 'partial' },
      sourceDomain: 'acme.careers',
      sourceUrl: 'https://acme.careers/jobs/swe-intern-2026',
      overallScore: 50,
      discoveredAt: new Date().toISOString(),
      summary: 'Test',
    };

    const verified = evidenceVerifier.verify(oppMissingStipend, content);

    expect(verified.stipend.value).toBeNull();
    expect(verified.stipend.status).toBe('unknown');
    expect(verified.stipend.confidenceScore).toBe(0.0);
    expect(verified.deadline.value).toBeNull();
    expect(verified.deadline.status).toBe('unknown');
  });
});
