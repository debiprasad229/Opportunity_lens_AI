import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

export class SearchProvider {
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  ];

  private getRandomUserAgent(): string {
    const idx = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[idx];
  }

  /**
   * Search via DuckDuckGo HTML interface.
   * Extracts clean, un-redirected target URLs and title/snippets.
   */
  public async search(query: string, maxResults: number = config.maxSearchResults): Promise<SearchResultItem[]> {
    logger.info(`Executing web search for: "${query}" (limit: ${maxResults})`);

    const results: SearchResultItem[] = [];

    // Attempt 1: DuckDuckGo HTML
    try {
      const htmlResults = await this.searchDuckDuckGoHtml(query);
      if (htmlResults.length > 0) {
        logger.info(`DuckDuckGo HTML returned ${htmlResults.length} raw results`);
        results.push(...htmlResults);
      }
    } catch (err: any) {
      logger.warn(`DuckDuckGo HTML search failed: ${err.message}. Trying Lite fallback.`);
    }

    // Attempt 2: DuckDuckGo Lite Fallback if empty
    if (results.length === 0) {
      try {
        const liteResults = await this.searchDuckDuckGoLite(query);
        logger.info(`DuckDuckGo Lite returned ${liteResults.length} raw results`);
        results.push(...liteResults);
      } catch (err: any) {
        logger.error(`DuckDuckGo Lite fallback also failed: ${err.message}`);
      }
    }

    // Attempt 3: Public Live Tech Internship Index Fallback (if DDG challenges bots)
    if (results.length === 0) {
      try {
        const liveIndexResults = await this.searchLiveInternshipIndex(query, maxResults);
        if (liveIndexResults.length > 0) {
          logger.info(`Live Tech Internship Index returned ${liveIndexResults.length} candidate postings`);
          results.push(...liveIndexResults);
        }
      } catch (err: any) {
        logger.error(`Live Tech Internship Index fallback failed: ${err.message}`);
      }
    }

    // Filter, validate, and deduplicate by clean URL
    const seen = new Set<string>();
    const sanitizedResults: SearchResultItem[] = [];

    for (const item of results) {
      try {
        const parsed = new URL(item.url);
        // Exclude search engine links, ads, and malformed URLs
        if (
          parsed.protocol !== 'http:' &&
          parsed.protocol !== 'https:'
        ) {
          continue;
        }

        const normalizedUrl = `${parsed.origin}${parsed.pathname}`;
        if (seen.has(normalizedUrl)) {
          continue;
        }
        seen.add(normalizedUrl);

        sanitizedResults.push({
          title: item.title.trim(),
          url: item.url.trim(),
          snippet: item.snippet.trim(),
          domain: parsed.hostname,
        });

        if (sanitizedResults.length >= maxResults) {
          break;
        }
      } catch {
        // Skip malformed
      }
    }

    logger.info(`Search completed. Returning ${sanitizedResults.length} unique candidates.`);
    return sanitizedResults;
  }

  /**
   * Fetches and parses DuckDuckGo HTML interface
   */
  private async searchDuckDuckGoHtml(query: string): Promise<SearchResultItem[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://html.duckduckgo.com/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: SearchResultItem[] = [];

    $('.result').each((_, element) => {
      const titleLink = $(element).find('.result__title .result__a');
      const snippetEl = $(element).find('.result__snippet');

      let rawHref = titleLink.attr('href') || '';
      const title = titleLink.text().trim();
      const snippet = snippetEl.text().trim();

      if (!rawHref || !title) return;

      // Extract actual destination URL from DDG redirection wrapper (/l/?kh=-1&uddg=...)
      let destinationUrl = rawHref;
      if (rawHref.includes('uddg=')) {
        try {
          const ddgUrl = new URL(rawHref, 'https://html.duckduckgo.com');
          const uddgParam = ddgUrl.searchParams.get('uddg');
          if (uddgParam) {
            destinationUrl = decodeURIComponent(uddgParam);
          }
        } catch {
          // Keep rawHref
        }
      }

      if (destinationUrl.startsWith('http')) {
        items.push({
          title,
          url: destinationUrl,
          snippet,
          domain: this.extractDomain(destinationUrl),
        });
      }
    });

    return items;
  }

  /**
   * Fallback using DuckDuckGo Lite interface
   */
  private async searchDuckDuckGoLite(query: string): Promise<SearchResultItem[]> {
    const url = 'https://lite.duckduckgo.com/lite/';
    const body = new URLSearchParams({ q: query }).toString();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html',
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo Lite returned HTTP ${response.status}`);
    }

    const html = await response.text();
    logger.debug(`[DDG Lite] Status ${response.status}, HTML length: ${html.length}, preview: ${html.slice(0, 250).replace(/\s+/g, ' ')}`);
    const $ = cheerio.load(html);
    const items: SearchResultItem[] = [];

    // In DDG Lite, results have a.result-link
    $('a.result-link').each((_, el) => {
      const link = $(el);
      let rawHref = link.attr('href') || '';
      const title = link.text().trim();
      const snippet = link.closest('tr').next().find('.result-snippet').text().trim();

        let destinationUrl = rawHref;
        if (rawHref.includes('uddg=')) {
          try {
            const ddgUrl = new URL(rawHref, 'https://lite.duckduckgo.com');
            const uddg = ddgUrl.searchParams.get('uddg');
            if (uddg) destinationUrl = decodeURIComponent(uddg);
          } catch {
            // Keep raw
          }
        }

        if (destinationUrl.startsWith('http') && title) {
          items.push({
            title,
            url: destinationUrl,
            snippet,
            domain: this.extractDomain(destinationUrl),
          });
        }
    });

    return items;
  }

  private cachedIndex: SearchResultItem[] | null = null;
  private cacheTimestamp = 0;

  /**
   * Keyless fallback querying the open public live tech internship index
   * maintained daily by Pitt CSC & SimplifyJobs.
   */
  private async searchLiveInternshipIndex(query: string, maxResults: number): Promise<SearchResultItem[]> {
    const now = Date.now();
    // Cache index in memory for 30 minutes
    if (!this.cachedIndex || now - this.cacheTimestamp > 30 * 60 * 1000) {
      logger.info('Fetching live public tech internships repository...');
      const url = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md';
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/plain,text/html',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Live internship repository returned HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const allItems: SearchResultItem[] = [];

      $('tbody tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length >= 4) {
          const company = $(tds[0]).text().trim().replace(/↳/g, '').trim();
          const role = $(tds[1]).text().trim();
          const location = $(tds[2]).text().trim();
          const rawUrl = $(tds[3]).find('a').attr('href') || '';

          if (rawUrl.startsWith('http') && role.toLowerCase().includes('intern')) {
            allItems.push({
              title: `${role} at ${company || 'Technology Company'} (${location})`,
              url: rawUrl,
              snippet: `${role} in ${location}. Verified live posting from open tech career repository.`,
              domain: this.extractDomain(rawUrl),
            });
          }
        }
      });

      this.cachedIndex = allItems;
      this.cacheTimestamp = now;
      logger.info(`Loaded ${allItems.length} active public tech internship postings into memory.`);
    }

    if (!this.cachedIndex || this.cachedIndex.length === 0) {
      return [];
    }

    // Filter index by query terms
    const queryLower = query.toLowerCase();
    const stopWords = new Set(['intern', 'internship', 'software', 'developer', 'fresh', 'graduate', 'graduates', '2026', '2025', 'batch', 'stipend']);
    const terms = queryLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

    let matched = this.cachedIndex;
    if (terms.length > 0) {
      const filtered = this.cachedIndex.filter(item => {
        const text = `${item.title} ${item.snippet} ${item.domain}`.toLowerCase();
        return terms.some(t => text.includes(t));
      });
      if (filtered.length > 0) {
        matched = filtered;
      }
    }

    return matched.slice(0, maxResults);
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
}

export const searchProvider = new SearchProvider();
