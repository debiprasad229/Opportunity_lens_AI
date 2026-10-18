import { describe, it, expect } from 'vitest';
import { htmlExtractor } from '../../src/services/htmlExtractor.js';

describe('HtmlExtractor', () => {
  it('should strip scripts, styles, navigation and extract core text and links', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Software Engineer Intern - Acme Corp</title>
          <style>.ad { color: red; }</style>
          <script>console.log('secret');</script>
        </head>
        <body>
          <nav><a href="/home">Home</a></nav>
          <main>
            <h1>Software Engineer Intern 2026</h1>
            <p>Acme Corp is hiring interns for our cloud team. Eligible candidates are 2026 batch graduates.</p>
            <p>Stipend: $5,000 / month.</p>
            <a href="https://acme.careers/apply/123" class="btn-apply">Apply Now</a>
          </main>
          <footer>Copyright Acme Corp</footer>
        </body>
      </html>
    `;

    const extracted = htmlExtractor.extract(rawHtml, 'https://acme.careers/jobs/intern');
    expect(extracted.title).toBe('Software Engineer Intern - Acme Corp');
    expect(extracted.cleanText).toContain('Software Engineer Intern 2026');
    expect(extracted.cleanText).toContain('Stipend: $5,000 / month.');
    expect(extracted.cleanText).not.toContain("console.log('secret')");
    expect(extracted.candidateApplyLinks).toContain('https://acme.careers/apply/123');
  });

  it('should handle empty or malformed html gracefully', () => {
    const extracted = htmlExtractor.extract('', 'https://example.com');
    expect(extracted.title).toBe('');
    expect(extracted.cleanText).toBe('');
    expect(extracted.candidateApplyLinks).toEqual([]);
  });
});
