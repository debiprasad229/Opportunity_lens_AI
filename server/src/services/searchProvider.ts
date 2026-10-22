import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  isOfficialCareerPage?: boolean;
}

/**
 * Standard interface for web search providers.
 */
export interface ISearchProvider {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string, maxResults?: number): Promise<SearchResultItem[]>;
}

/**
 * Normalizes and canonicalizes URLs:
 * - Strips tracking query parameters (utm_*, ref, gclid, etc.)
 * - Trims trailing slashes
 * - Lowercases hostname
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    // List of tracking query parameters to strip
    const trackingParams = new Set([
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'ref_id', 'source', 'fbclid', 'gclid', 'msclkid', 'trk', 'gh_src'
    ]);

    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      if (!trackingParams.has(key.toLowerCase()) && !key.toLowerCase().startsWith('utm_')) {
        cleanParams.append(key, val);
      }
    });

    const queryString = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}${queryString}`;
  } catch {
    return '';
  }
}

/**
 * Checks if a domain or URL represents an official company career page
 * or an Applicant Tracking System (ATS).
 */
export function isOfficialCareerPage(url: string, domain: string): boolean {
  const d = domain.toLowerCase();
  const u = url.toLowerCase();

  // Known Applicant Tracking Systems (ATS) and company job boards
  const knownAtsDomains = [
    'greenhouse.io',
    'lever.co',
    'myworkdayjobs.com',
    'ashbyhq.com',
    'smartrecruiters.com',
    'icims.com',
    'recruitee.com',
    'bamboohr.com',
    'jobvite.com',
    'taleo.net',
    'applytojob.com',
    'workable.com',
  ];

  if (knownAtsDomains.some((ats) => d.includes(ats))) {
    return true;
  }

  // Official careers subdomains: careers.company.com, jobs.company.com
  if (d.startsWith('careers.') || d.startsWith('jobs.') || d.startsWith('join.')) {
    return true;
  }

  // Official career paths: company.com/careers/..., company.com/jobs/...
  if (u.includes('/careers/') || u.includes('/jobs/') || u.includes('/job/') || u.includes('/posting/')) {
    return true;
  }

  return false;
}

/**
 * Scores and sorts search results to prioritize official company career pages.
 */
export function prioritizeSearchResults(items: SearchResultItem[]): SearchResultItem[] {
  return [...items].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const isOfficialA = isOfficialCareerPage(a.url, a.domain);
    const isOfficialB = isOfficialCareerPage(b.url, b.domain);

    if (isOfficialA) scoreA += 50;
    if (isOfficialB) scoreB += 50;

    const lowerA = a.url.toLowerCase();
    const lowerB = b.url.toLowerCase();

    // Boost if path has specific vacancy indicators
    if (/\/jobs?\/[a-z0-9\-]+/i.test(lowerA) || lowerA.includes('lever.co') || lowerA.includes('greenhouse.io')) scoreA += 25;
    if (/\/jobs?\/[a-z0-9\-]+/i.test(lowerB) || lowerB.includes('lever.co') || lowerB.includes('greenhouse.io')) scoreB += 25;

    // Slight penalty for pure aggregator/community listing feeds when comparing with direct portals
    const aggregators = ['glassdoor.', 'indeed.', 'ambitionbox.', 'freshersworld.', 'internshala.'];
    if (aggregators.some((agg) => a.domain.includes(agg))) scoreA -= 15;
    if (aggregators.some((agg) => b.domain.includes(agg))) scoreB -= 15;

    return scoreB - scoreA;
  });
}

/**
 * Tavily Search API Provider
 */
export class TavilySearchProvider implements ISearchProvider {
  public readonly name = 'Tavily Search API';

  public isAvailable(): boolean {
    return Boolean(config.tavilyApiKey && config.tavilyApiKey.trim() !== '');
  }

  public async search(query: string, maxResults: number = config.maxSearchResults): Promise<SearchResultItem[]> {
    if (!this.isAvailable()) {
      throw new Error('TAVILY_API_KEY is not configured');
    }

    logger.info(`[Tavily] Executing search for: "${query}"`);
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.tavilyApiKey,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Tavily API responded with status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const items: SearchResultItem[] = [];

    if (Array.isArray(data.results)) {
      for (const res of data.results) {
        if (res.url && res.title) {
          try {
            const domain = new URL(res.url).hostname;
            items.push({
              title: res.title.trim(),
              url: res.url.trim(),
              snippet: (res.content || '').trim(),
              domain,
              isOfficialCareerPage: isOfficialCareerPage(res.url, domain),
            });
          } catch {
            // Skip invalid URL
          }
        }
      }
    }

    return items;
  }
}

/**
 * Serper (Google Search) API Provider
 */
export class SerperSearchProvider implements ISearchProvider {
  public readonly name = 'Serper Google Search API';

  public isAvailable(): boolean {
    return Boolean(config.serperApiKey && config.serperApiKey.trim() !== '');
  }

  public async search(query: string, maxResults: number = config.maxSearchResults): Promise<SearchResultItem[]> {
    if (!this.isAvailable()) {
      throw new Error('SERPER_API_KEY is not configured');
    }

    logger.info(`[Serper] Executing Google search for: "${query}"`);
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': config.serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Serper API responded with status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const items: SearchResultItem[] = [];

    if (Array.isArray(data.organic)) {
      for (const res of data.organic) {
        if (res.link && res.title) {
          try {
            const domain = new URL(res.link).hostname;
            items.push({
              title: res.title.trim(),
              url: res.link.trim(),
              snippet: (res.snippet || '').trim(),
              domain,
              isOfficialCareerPage: isOfficialCareerPage(res.link, domain),
            });
          } catch {
            // Skip invalid URL
          }
        }
      }
    }

    return items;
  }
}

/**
 * Brave Search API Provider
 */
export class BraveSearchProvider implements ISearchProvider {
  public readonly name = 'Brave Search API';

  public isAvailable(): boolean {
    return Boolean(config.braveApiKey && config.braveApiKey.trim() !== '');
  }

  public async search(query: string, maxResults: number = config.maxSearchResults): Promise<SearchResultItem[]> {
    if (!this.isAvailable()) {
      throw new Error('BRAVE_API_KEY is not configured');
    }

    logger.info(`[Brave] Executing search for: "${query}"`);
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': config.braveApiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brave API responded with status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const items: SearchResultItem[] = [];

    if (data.web && Array.isArray(data.web.results)) {
      for (const res of data.web.results) {
        if (res.url && res.title) {
          try {
            const domain = new URL(res.url).hostname;
            items.push({
              title: res.title.trim(),
              url: res.url.trim(),
              snippet: (res.description || '').trim(),
              domain,
              isOfficialCareerPage: isOfficialCareerPage(res.url, domain),
            });
          } catch {
            // Skip invalid URL
          }
        }
      }
    }

    return items;
  }
}

/**
 * Keyless DuckDuckGo Provider (HTML and Lite interfaces)
 */
export class DuckDuckGoSearchProvider implements ISearchProvider {
  public readonly name = 'DuckDuckGo Live Search';

  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ];

  public isAvailable(): boolean {
    return true; // Always available without API key
  }

  public async search(query: string, maxResults: number = config.maxSearchResults): Promise<SearchResultItem[]> {
    logger.info(`[DuckDuckGo] Executing search for: "${query}"`);
    let results: SearchResultItem[] = [];

    // Attempt 1: DuckDuckGo HTML
    try {
      results = await this.searchDuckDuckGoHtml(query);
    } catch (err: any) {
      logger.warn(`DuckDuckGo HTML search failed: ${err.message}. Trying Lite interface.`);
    }

    // Attempt 2: DuckDuckGo Lite
    if (results.length === 0) {
      try {
        results = await this.searchDuckDuckGoLite(query);
      } catch (err: any) {
        logger.error(`DuckDuckGo Lite search also failed: ${err.message}`);
      }
    }

    return results.slice(0, maxResults);
  }

  private async searchDuckDuckGoHtml(query: string): Promise<SearchResultItem[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgents[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

      const rawHref = titleLink.attr('href') || '';
      const title = titleLink.text().trim();
      const snippet = snippetEl.text().trim();

      if (!rawHref || !title) return;

      let destinationUrl = rawHref;
      if (rawHref.includes('uddg=')) {
        try {
          const ddgUrl = new URL(rawHref, 'https://html.duckduckgo.com');
          const uddgParam = ddgUrl.searchParams.get('uddg');
          if (uddgParam) destinationUrl = decodeURIComponent(uddgParam);
        } catch {
          // Keep rawHref
        }
      }

      if (destinationUrl.startsWith('http')) {
        try {
          const domain = new URL(destinationUrl).hostname;
          items.push({
            title,
            url: destinationUrl,
            snippet,
            domain,
            isOfficialCareerPage: isOfficialCareerPage(destinationUrl, domain),
          });
        } catch {
          // Skip
        }
      }
    });

    return items;
  }

  private async searchDuckDuckGoLite(query: string): Promise<SearchResultItem[]> {
    const url = 'https://lite.duckduckgo.com/lite/';
    const body = new URLSearchParams({ q: query }).toString();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': this.userAgents[1],
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
    const $ = cheerio.load(html);
    const items: SearchResultItem[] = [];

    $('a.result-link').each((_, el) => {
      const link = $(el);
      const rawHref = link.attr('href') || '';
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
        try {
          const domain = new URL(destinationUrl).hostname;
          items.push({
            title,
            url: destinationUrl,
            snippet,
            domain,
            isOfficialCareerPage: isOfficialCareerPage(destinationUrl, domain),
          });
        } catch {
          // Skip
        }
      }
    });

    return items;
  }
}

/**
 * Public Live Tech Internship Index Provider (Pitt CSC & SimplifyJobs)
 */
export class LiveIndexSearchProvider implements ISearchProvider {
  public readonly name = 'Live Tech Internship Index';
  private cachedIndex: SearchResultItem[] | null = null;
  private cacheTimestamp = 0;

  public isAvailable(): boolean {
    return true;
  }

  public async search(query: string, maxResults: number = config.maxSearchResults): Promise<SearchResultItem[]> {
    const now = Date.now();
    if (!this.cachedIndex || now - this.cacheTimestamp > 30 * 60 * 1000) {
      logger.info('Fetching live public tech internships repository...');
      const url = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md';
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OpportunityLensBot/1.0',
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
            try {
              const domain = new URL(rawUrl).hostname;
              allItems.push({
                title: `${role} at ${company || 'Technology Company'} (${location})`,
                url: rawUrl,
                snippet: `${role} in ${location}. Verified live posting from open tech career repository.`,
                domain,
                isOfficialCareerPage: isOfficialCareerPage(rawUrl, domain),
              });
            } catch {
              // Skip
            }
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

    const queryLower = query.toLowerCase();
    const stopWords = new Set(['intern', 'internship', 'software', 'developer', 'fresh', 'graduate', 'graduates', '2026', '2025', 'batch', 'stipend']);
    const terms = queryLower.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));

    let matched = this.cachedIndex;
    if (terms.length > 0) {
      const filtered = this.cachedIndex.filter((item) => {
        const text = `${item.title} ${item.snippet} ${item.domain}`.toLowerCase();
        return terms.some((t) => text.includes(t));
      });
      if (filtered.length > 0) {
        matched = filtered;
      }
    }

    return matched.slice(0, maxResults);
  }
}

/**
 * Composite Search Provider Manager:
 * Handles provider selection, fallback cascade, URL canonicalization,
 * deduplication, and career-page prioritization.
 */
export class SearchProviderManager implements ISearchProvider {
  public readonly name = 'OpportunityLens Search Provider Manager';

  private tavilyProvider = new TavilySearchProvider();
  private serperProvider = new SerperSearchProvider();
  private braveProvider = new BraveSearchProvider();
  private ddgProvider = new DuckDuckGoSearchProvider();
  private liveIndexProvider = new LiveIndexSearchProvider();

  public isAvailable(): boolean {
    return true;
  }

  /**
   * Returns the primary active search provider based on configuration & available keys
   */
  public getActiveProviderName(): string {
    const pref = config.searchProvider.toLowerCase();
    if (pref === 'tavily' && this.tavilyProvider.isAvailable()) return this.tavilyProvider.name;
    if (pref === 'serper' && this.serperProvider.isAvailable()) return this.serperProvider.name;
    if (pref === 'brave' && this.braveProvider.isAvailable()) return this.braveProvider.name;
    if (pref === 'duckduckgo') return this.ddgProvider.name;
    if (pref === 'live-index') return this.liveIndexProvider.name;

    // Auto mode
    if (this.tavilyProvider.isAvailable()) return this.tavilyProvider.name;
    if (this.serperProvider.isAvailable()) return this.serperProvider.name;
    if (this.braveProvider.isAvailable()) return this.braveProvider.name;
    return this.ddgProvider.name;
  }

  /**
   * Unified search method:
   * 1. Query selected provider (or fallback cascade)
   * 2. Canonicalize and deduplicate URLs
   * 3. Prioritize official company career pages and ATS listings
   * 4. Bound to maxResults
   */
  public async search(query: string, maxResults: number = config.maxSearchResults): Promise<SearchResultItem[]> {
    logger.info(`Search manager executing search. Active provider: ${this.getActiveProviderName()}`);

    let rawResults: SearchResultItem[] = [];

    // Preferred provider check
    const pref = config.searchProvider.toLowerCase();

    if (pref === 'tavily' || (pref === 'auto' && this.tavilyProvider.isAvailable())) {
      try {
        rawResults = await this.tavilyProvider.search(query, maxResults);
      } catch (err: any) {
        logger.warn(`Tavily search failed: ${err.message}. Falling back.`);
      }
    }

    if (rawResults.length === 0 && (pref === 'serper' || (pref === 'auto' && this.serperProvider.isAvailable()))) {
      try {
        rawResults = await this.serperProvider.search(query, maxResults);
      } catch (err: any) {
        logger.warn(`Serper search failed: ${err.message}. Falling back.`);
      }
    }

    if (rawResults.length === 0 && (pref === 'brave' || (pref === 'auto' && this.braveProvider.isAvailable()))) {
      try {
        rawResults = await this.braveProvider.search(query, maxResults);
      } catch (err: any) {
        logger.warn(`Brave search failed: ${err.message}. Falling back.`);
      }
    }

    // Keyless Fallback 1: DuckDuckGo Live
    if (rawResults.length === 0 && pref !== 'live-index') {
      try {
        rawResults = await this.ddgProvider.search(query, maxResults);
      } catch (err: any) {
        logger.warn(`DuckDuckGo search failed: ${err.message}. Falling back to Live Tech Index.`);
      }
    }

    // Keyless Fallback 2: Live Tech Internship Index
    if (rawResults.length === 0) {
      try {
        rawResults = await this.liveIndexProvider.search(query, maxResults);
      } catch (err: any) {
        logger.error(`Live Index search fallback failed: ${err.message}`);
      }
    }

    // Deduplicate and canonicalize URLs
    const seenUrls = new Set<string>();
    const deduplicated: SearchResultItem[] = [];

    for (const item of rawResults) {
      const canonical = canonicalizeUrl(item.url);
      if (!canonical) continue;

      if (!seenUrls.has(canonical)) {
        seenUrls.add(canonical);
        deduplicated.push({
          ...item,
          url: canonical,
          domain: new URL(canonical).hostname,
          isOfficialCareerPage: isOfficialCareerPage(canonical, new URL(canonical).hostname),
        });
      }
    }

    // Prioritize official company career pages over aggregators
    const prioritized = prioritizeSearchResults(deduplicated);

    const bounded = prioritized.slice(0, maxResults);
    logger.info(`Search completed. Returning ${bounded.length} bounded, prioritized candidates.`);
    return bounded;
  }
}

export const searchProvider = new SearchProviderManager();
