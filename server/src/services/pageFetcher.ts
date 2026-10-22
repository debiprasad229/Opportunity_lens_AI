import { validateSafeUrl, SSRFError } from '../utils/ssrfGuard.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export interface FetchedPage {
  url: string;
  finalUrl: string;
  html: string;
  statusCode: number;
  contentType: string;
  fetchDurationMs: number;
  success: boolean;
  isRestricted?: boolean;
  error?: string;
}

export class SafePageFetcher {
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'OpportunityLensBot/1.0 (+https://github.com/debiprasad229/Opportunity_lens_AI; research-agent)',
  ];

  /**
   * Safely fetches a web page with strict SSRF protection,
   * redirect validation, timeouts, and byte limits.
   */
  public async fetchPage(targetUrl: string, maxRedirects: number = 3): Promise<FetchedPage> {
    const startTime = Date.now();
    let currentUrl = targetUrl;
    let redirectCount = 0;

    logger.info(`Fetching page: ${targetUrl}`);

    try {
      while (redirectCount <= maxRedirects) {
        // Step 1: Validate URL and resolve DNS against private/reserved ranges
        const validatedUrl = await validateSafeUrl(currentUrl);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.fetchTimeoutMs);

        let response: Response;
        try {
          response = await fetch(validatedUrl.toString(), {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Upgrade-Insecure-Requests': '1',
              'Cache-Control': 'no-cache',
            },
            redirect: 'manual', // We handle redirects manually to enforce SSRF validation at every step!
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        // Handle Redirects (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            throw new Error(`Exceeded maximum allowed redirects (${maxRedirects})`);
          }

          const locationHeader = response.headers.get('location');
          if (!locationHeader) {
            throw new Error(`Received redirect status ${response.status} without Location header`);
          }

          const nextUrl = new URL(locationHeader, currentUrl).toString();
          logger.debug(`Redirecting [${redirectCount}/${maxRedirects}] to: ${nextUrl}`);
          currentUrl = nextUrl;
          continue;
        }

        const contentType = response.headers.get('content-type') || '';

        // Check for access controls / auth requirements (401 / 403)
        if (response.status === 401 || response.status === 403) {
          return {
            url: targetUrl,
            finalUrl: currentUrl,
            html: '',
            statusCode: response.status,
            contentType,
            fetchDurationMs: Date.now() - startTime,
            success: false,
            isRestricted: true,
            error: `Access restricted (HTTP ${response.status}): Authentication or permission required. Respecting access controls.`,
          };
        }

        // Check if redirect ended at a login/auth page
        const lowerFinalUrl = currentUrl.toLowerCase();
        if (lowerFinalUrl.includes('/login') || lowerFinalUrl.includes('/signin') || lowerFinalUrl.includes('/auth/')) {
          return {
            url: targetUrl,
            finalUrl: currentUrl,
            html: '',
            statusCode: response.status,
            contentType,
            fetchDurationMs: Date.now() - startTime,
            success: false,
            isRestricted: true,
            error: 'Access restricted: Redirected to login page. Respecting authentication barrier.',
          };
        }

        // Only accept HTML or text
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
          throw new Error(`Unsupported content type: ${contentType}. Expected HTML.`);
        }

        // Read response body with byte limit
        const html = await this.readBodyWithLimit(response, config.maxResponseSizeBytes);
        const duration = Date.now() - startTime;

        // Check for CAPTCHA challenges or bot verification walls
        const isCaptchaChallenge =
          /cf-challenge|cf-browser-verification|g-recaptcha|hcaptcha|challenge-running|Attention Required! \| Cloudflare|robot check|distil_ident/i.test(html);

        if (isCaptchaChallenge) {
          return {
            url: targetUrl,
            finalUrl: currentUrl,
            html: '',
            statusCode: response.status,
            contentType,
            fetchDurationMs: duration,
            success: false,
            isRestricted: true,
            error: 'Access restricted: CAPTCHA / bot challenge page detected. Respecting website restrictions.',
          };
        }

        return {
          url: targetUrl,
          finalUrl: currentUrl,
          html,
          statusCode: response.status,
          contentType,
          fetchDurationMs: duration,
          success: response.ok,
          isRestricted: false,
          error: response.ok ? undefined : `HTTP error ${response.status} ${response.statusText}`,
        };
      }

      throw new Error(`Exceeded maximum allowed redirects`);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const isSSRF = err instanceof SSRFError;
      const errorMsg = isSSRF ? `[SSRF Blocked] ${err.message}` : err.message;
      logger.warn(`Failed to fetch ${targetUrl}: ${errorMsg}`);

      return {
        url: targetUrl,
        finalUrl: currentUrl,
        html: '',
        statusCode: 0,
        contentType: '',
        fetchDurationMs: duration,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Safely reads response stream up to maxBytes to avoid memory exhaustion (DoS).
   */
  private async readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
    if (!response.body) {
      return '';
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > maxBytes) {
          reader.cancel('Size limit exceeded');
          throw new Error(`Response size exceeded limit of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }

    const allBytes = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      allBytes.set(chunk, offset);
      offset += chunk.length;
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(allBytes);
  }
}

export const safePageFetcher = new SafePageFetcher();
