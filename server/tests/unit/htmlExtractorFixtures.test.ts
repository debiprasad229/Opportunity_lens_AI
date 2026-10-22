import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { htmlExtractor } from '../../src/services/htmlExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('HtmlExtractor with Saved HTML Fixtures', () => {
  it('should extract structured fields, tables, and JSON-LD from company career detail page', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'company_career_detail.html'), 'utf-8');
    const pageUrl = 'https://acme.careers/jobs/swe-intern-2026';

    const result = htmlExtractor.extract(html, pageUrl);

    expect(result.title).toContain('Software Engineer Intern - Summer 2026');
    expect(result.cleanText).toContain('Acme Cloud Technologies');
    expect(result.cleanText).toContain('$52 per hour');
    expect(result.cleanText).toContain('November 30, 2026');
    expect(result.cleanText).toContain('graduating in 2026');

    // JSON-LD JobPosting parsed
    expect(result.jsonLdJobs.length).toBeGreaterThan(0);
    expect(result.jsonLdJobs[0]['@type']).toBe('JobPosting');

    // Candidate apply links detected
    expect(result.candidateApplyLinks).toContain('https://boards.greenhouse.io/acme/jobs/492019');

    // Detail page is NOT an index page
    expect(result.isIndexPage).toBe(false);
  });

  it('should detect an index/listing page and extract individual vacancy links', () => {
    const html = fs.readFileSync(path.join(fixturesDir, 'job_board_index.html'), 'utf-8');
    const pageUrl = 'https://careers.cloudscale.io/openings';

    const result = htmlExtractor.extract(html, pageUrl);

    // Should detect index page
    expect(result.isIndexPage).toBe(true);

    // Should detect individual vacancy links
    expect(result.individualVacancyLinks.length).toBeGreaterThanOrEqual(2);
    const urls = result.individualVacancyLinks.map((v) => v.url);
    expect(urls).toContain('https://careers.cloudscale.io/jobs/swe-intern-2026');
    expect(urls).toContain('https://careers.cloudscale.io/jobs/frontend-intern-2026');
  });
});
