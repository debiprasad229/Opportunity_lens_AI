import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app } from '../../src/app.js';
import { searchProvider } from '../../src/services/searchProvider.js';
import { safePageFetcher } from '../../src/services/pageFetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('OpportunityLens Research Pipeline Integration', () => {
  it('should reject invalid or too-short queries via Zod schema', async () => {
    const res = await request(app)
      .post('/api/research')
      .send({ query: 'a' }) // Min length is 3
      .expect(400);

    expect(res.body.error).toContain('Validation Error');
  });

  it('should run complete research pipeline end-to-end using saved HTML fixture', async () => {
    const fixtureHtml = fs.readFileSync(path.join(fixturesDir, 'company_career_detail.html'), 'utf-8');

    // Mock searchProvider to return candidate pointing to fixture URL
    const searchSpy = vi.spyOn(searchProvider, 'search').mockResolvedValue([
      {
        title: 'Software Engineer Intern - Acme Cloud Technologies',
        url: 'https://acme.careers/jobs/swe-intern-2026',
        snippet: 'Acme Cloud Technologies is hiring a Software Engineer Intern for Summer 2026.',
        domain: 'acme.careers',
        isOfficialCareerPage: true,
      },
    ]);

    // Mock safePageFetcher to return fixture HTML
    const fetchSpy = vi.spyOn(safePageFetcher, 'fetchPage').mockResolvedValue({
      url: 'https://acme.careers/jobs/swe-intern-2026',
      finalUrl: 'https://acme.careers/jobs/swe-intern-2026',
      html: fixtureHtml,
      statusCode: 200,
      contentType: 'text/html; charset=utf-8',
      fetchDurationMs: 45,
      success: true,
      isRestricted: false,
    });

    const res = await request(app)
      .post('/api/research')
      .send({
        query: 'software engineer intern 2026 stipend',
        maxResults: 2,
      })
      .expect(200);

    expect(res.body).toHaveProperty('query');
    expect(res.body.generatedQueryVariants.length).toBeGreaterThan(0);
    expect(res.body.timeline.length).toBeGreaterThan(0);
    expect(res.body.sourcesConsulted.length).toBeGreaterThan(0);
    expect(res.body.opportunities.length).toBeGreaterThan(0);

    const opp = res.body.opportunities[0];
    expect(opp.companyName.value).toBe('Acme Cloud Technologies');
    expect(opp.companyName.status).toBe('verified');
    expect(opp.stipend.value).toContain('$52 per hour');
    expect(opp.stipend.status).toBe('verified');
    expect(opp.deadline.value).toContain('November 30, 2026');
    expect(opp.deadline.status).toBe('verified');
    expect(opp.deadline.normalizedDate).toBe('2026-11-30');
    expect(opp.officialApplicationLink.value).toBe('https://boards.greenhouse.io/acme/jobs/492019');

    searchSpy.mockRestore();
    fetchSpy.mockRestore();
  }, 25000);

  it('should provide system capabilities via /api/health', async () => {
    const res = await request(app).get('/api/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.capabilities).toHaveProperty('searchProvider');
    expect(res.body.capabilities).toHaveProperty('followVacancyLinks');
    expect(res.body.capabilities.ssrfGuardActive).toBe(true);
  });
});
