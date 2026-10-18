import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

export interface ExtractedContent {
  title: string;
  metaDescription?: string;
  cleanText: string;
  jsonLdJobs: any[];
  candidateApplyLinks: string[];
  tablesText: string[];
  headings: string[];
}

export class HtmlExtractor {
  /**
   * Cleans raw HTML, extracts JSON-LD schemas, removes boilerplate,
   * gathers tables/lists, and returns focused textual content for LLM analysis.
   */
  public extract(html: string, pageUrl: string): ExtractedContent {
    if (!html || html.trim() === '') {
      return {
        title: '',
        cleanText: '',
        jsonLdJobs: [],
        candidateApplyLinks: [],
        tablesText: [],
        headings: [],
      };
    }

    const $ = cheerio.load(html);

    // 1. Extract JSON-LD structured data (especially JobPosting or Organization)
    const jsonLdJobs: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).html()?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item['@type'] === 'JobPosting' || item['@type'] === 'Organization') {
                jsonLdJobs.push(item);
              }
            });
          } else if (parsed['@type'] === 'JobPosting' || parsed['@type'] === 'Organization') {
            jsonLdJobs.push(parsed);
          } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            parsed['@graph'].forEach((item: any) => {
              if (item['@type'] === 'JobPosting' || item['@type'] === 'Organization') {
                jsonLdJobs.push(item);
              }
            });
          }
        }
      } catch {
        // Ignore invalid JSON-LD
      }
    });

    // 2. Extract Candidate Application Links before stripping anchors
    const candidateApplyLinks: string[] = [];
    const applyPatterns = /apply|submit|career|job|intern|workday|lever\.co|greenhouse\.io|smartrecruiters/i;

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      const idOrClass = `${$(el).attr('id') || ''} ${$(el).attr('class') || ''}`;

      if (href && (applyPatterns.test(href) || applyPatterns.test(text) || applyPatterns.test(idOrClass))) {
        try {
          const resolved = new URL(href, pageUrl).toString();
          if (
            resolved.startsWith('http') &&
            !resolved.includes('javascript:') &&
            !candidateApplyLinks.includes(resolved)
          ) {
            candidateApplyLinks.push(resolved);
          }
        } catch {
          // Ignore invalid URL
        }
      }
    });

    // 3. Extract Headings for role/company cues
    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const heading = $(el).text().trim().replace(/\s+/g, ' ');
      if (heading.length > 3 && heading.length < 150) {
        headings.push(heading);
      }
    });

    // 4. Extract Tables (often contain stipend, duration, eligibility tables)
    const tablesText: string[] = [];
    $('table').each((_, table) => {
      const rows: string[] = [];
      $(table).find('tr').each((_, tr) => {
        const cells: string[] = [];
        $(tr).find('th, td').each((_, td) => {
          cells.push($(td).text().trim().replace(/\s+/g, ' '));
        });
        if (cells.length > 0) {
          rows.push(cells.join(' | '));
        }
      });
      if (rows.length > 0) {
        tablesText.push(rows.join('\n'));
      }
    });

    // 5. Page Title and Meta Description
    const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
    const metaDescription =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    // 6. Strip Boilerplate (scripts, styles, navigation, footer, banners, ads)
    $('script, style, noscript, svg, iframe, canvas, nav, footer, header, form, aside').remove();
    $('.cookie-banner, .cookie-consent, #cookie-banner, #onetrust-consent-sdk, .advertisement, .ad, .social-share').remove();

    // 7. Get Main Content Area if available (main, article, #content, .content, .job-details)
    let mainSelector = $('main, article, [role="main"], .job-details, .job-description, .posting-content, #content, .content');
    let textTarget = mainSelector.length > 0 ? mainSelector : $('body');

    // Clean whitespace and linebreaks
    let cleanText = textTarget.text().replace(/\s+/g, ' ').trim();

    // Ensure title and meta description are included in cleanText so SPA/Workday pages have extractable context
    if (title || metaDescription) {
      cleanText = `${title}. ${metaDescription ? metaDescription + '. ' : ''}${cleanText}`.trim();
    }

    // Truncate to ~14,000 characters for token efficiency while keeping enough context
    const maxChars = 14000;
    if (cleanText.length > maxChars) {
      cleanText = cleanText.substring(0, maxChars) + '... [truncated]';
    }

    logger.debug(`Extracted content from ${pageUrl}: title="${title}", length=${cleanText.length}`);

    return {
      title,
      metaDescription,
      cleanText,
      jsonLdJobs,
      candidateApplyLinks: candidateApplyLinks.slice(0, 5),
      tablesText: tablesText.slice(0, 3),
      headings: headings.slice(0, 8),
    };
  }
}

export const htmlExtractor = new HtmlExtractor();
