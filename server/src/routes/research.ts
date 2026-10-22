import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { queryPlanner } from '../services/queryPlanner.js';
import { searchProvider, SearchResultItem } from '../services/searchProvider.js';
import { safePageFetcher } from '../services/pageFetcher.js';
import { htmlExtractor, ExtractedContent } from '../services/htmlExtractor.js';
import { geminiAdapter } from '../services/geminiAdapter.js';
import { evidenceVerifier } from '../services/evidenceVerifier.js';
import { opportunityRanker } from '../services/ranker.js';
import { researchRateLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  ResearchResult,
  ResearchPlanStep,
  InternshipOpportunity,
} from '../../../shared/types.js';

const router = Router();

// Zod validation schema for research request payload
const researchRequestSchema = z.object({
  query: z
    .string()
    .min(3, 'Query must be at least 3 characters long')
    .max(500, 'Query cannot exceed 500 characters'),
  maxResults: z.number().int().min(1).max(15).optional().default(8),
  locationFilter: z.string().max(100).optional(),
});

/**
 * Standard REST POST endpoint for complete research workflow
 */
router.post('/', researchRateLimiter, async (req: Request, res: Response, next) => {
  const startTime = Date.now();
  try {
    const validated = researchRequestSchema.parse(req.body);
    const { query, maxResults, locationFilter } = validated;

    const timeline: ResearchPlanStep[] = [];
    const addStep = (step: ResearchPlanStep['step'], message: string, details?: any) => {
      timeline.push({ step, message, timestamp: new Date().toISOString(), details });
    };

    logger.info(`Starting research session for: "${query}" (provider: ${searchProvider.getActiveProviderName()})`);

    // 1. Planning Step
    addStep('planning', 'Analyzing research intent and generating focused search queries targeting official career pages...');
    const plan = queryPlanner.plan(query, locationFilter);
    logger.info(`Generated ${plan.searchVariants.length} query variants`);

    // 2. Searching Step
    addStep('searching', `Executing live search across public web using ${searchProvider.getActiveProviderName()}...`, {
      variants: plan.searchVariants,
    });

    const candidateMap = new Map<string, SearchResultItem>();
    for (const variant of plan.searchVariants) {
      if (candidateMap.size >= maxResults) break;
      try {
        const results = await searchProvider.search(variant, maxResults);
        for (const item of results) {
          if (!candidateMap.has(item.url)) {
            candidateMap.set(item.url, item);
          }
          if (candidateMap.size >= maxResults) break;
        }
      } catch (err: any) {
        logger.warn(`Search variant failed: "${variant}": ${err.message}`);
      }
      if (candidateMap.size >= maxResults) break;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    const candidateList = Array.from(candidateMap.values());
    logger.info(`Located ${candidateList.length} candidate postings from search`);

    // 3. Safe Fetching & Content Extraction Step
    addStep('fetching', `Safely fetching and inspecting ${candidateList.length} candidate websites (SSRF protected, respecting access restrictions)...`, {
      count: candidateList.length,
    });

    const sourcesConsulted: ResearchResult['sourcesConsulted'] = [];
    const extractedOpportunities: InternshipOpportunity[] = [];
    const fetchedUrls = new Set<string>();

    for (const candidate of candidateList) {
      fetchedUrls.add(candidate.url);
      const page = await safePageFetcher.fetchPage(candidate.url);

      sourcesConsulted.push({
        title: candidate.title,
        url: candidate.url,
        domain: candidate.domain,
        fetchedSuccessfully: page.success,
        errorReason: page.error,
      });

      if (!page.success || !page.html) {
        continue;
      }

      // 4. HTML Extraction
      const content = htmlExtractor.extract(page.html, page.finalUrl);

      // 5. LLM Fact Extraction
      let opportunity = await geminiAdapter.extractOpportunity(content, page.finalUrl);

      // Follow individual vacancy links if page is an index/listing and didn't yield an opportunity
      if (
        (!opportunity || content.isIndexPage) &&
        config.followVacancyLinks &&
        content.individualVacancyLinks.length > 0 &&
        extractedOpportunities.length < maxResults
      ) {
        const linksToFollow = content.individualVacancyLinks
          .filter((v) => !fetchedUrls.has(v.url))
          .slice(0, config.maxVacancyLinksPerPage);

        for (const vacancy of linksToFollow) {
          if (extractedOpportunities.length >= maxResults) break;
          fetchedUrls.add(vacancy.url);
          logger.info(`Following vacancy link from index page to: ${vacancy.url}`);

          const vacancyPage = await safePageFetcher.fetchPage(vacancy.url);
          sourcesConsulted.push({
            title: vacancy.title,
            url: vacancy.url,
            domain: new URL(vacancy.url).hostname,
            fetchedSuccessfully: vacancyPage.success,
            errorReason: vacancyPage.error,
          });

          if (vacancyPage.success && vacancyPage.html) {
            const vacancyContent = htmlExtractor.extract(vacancyPage.html, vacancyPage.finalUrl);
            const vacancyOpp = await geminiAdapter.extractOpportunity(vacancyContent, vacancyPage.finalUrl);
            if (vacancyOpp) {
              const verifiedVacancy = evidenceVerifier.verify(vacancyOpp, vacancyContent);
              extractedOpportunities.push(verifiedVacancy);
            }
          }
        }
      }

      if (opportunity) {
        // 6. Evidence Verification
        const verified = evidenceVerifier.verify(opportunity, content);
        extractedOpportunities.push(verified);
      }
    }

    addStep('extracting', 'Extracted structured facts and normalized deadline dates from retrieved pages...');
    addStep('verifying', 'Audited all extracted claims against source text quotes to prevent hallucinations...');

    // 7. Ranking Step
    addStep('ranking', `Ranking ${extractedOpportunities.length} opportunities by evidence confidence and relevance...`);
    const rankedOpportunities = opportunityRanker.rank(extractedOpportunities, query);

    // Compute stats
    let verifiedCount = 0;
    let partialCount = 0;
    let unknownCount = 0;

    for (const opp of rankedOpportunities) {
      const statuses = [
        opp.companyName.status,
        opp.roleTitle.status,
        opp.eligibility.status,
        opp.stipend.status,
        opp.deadline.status,
        opp.officialApplicationLink.status,
      ];
      for (const s of statuses) {
        if (s === 'verified') verifiedCount++;
        else if (s === 'partial') partialCount++;
        else if (s === 'unknown') unknownCount++;
      }
    }

    const executionTimeMs = Date.now() - startTime;
    addStep('completed', `Research completed in ${(executionTimeMs / 1000).toFixed(1)}s. Discovered ${rankedOpportunities.length} grounded opportunities.`);

    const result: ResearchResult = {
      query,
      generatedQueryVariants: plan.searchVariants,
      opportunities: rankedOpportunities,
      sourcesConsulted,
      timeline,
      totalDiscovered: rankedOpportunities.length,
      verifiedCount,
      partialCount,
      unknownCount,
      executionTimeMs,
    };

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * Server-Sent Events (SSE) streaming endpoint for live progress updates
 */
router.post('/stream', researchRateLimiter, async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Setup SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const validated = researchRequestSchema.parse(req.body);
    const { query, maxResults, locationFilter } = validated;

    sendEvent('step', {
      step: 'planning',
      message: 'Analyzing requirements and planning search strategies...',
    });

    const plan = queryPlanner.plan(query, locationFilter);

    sendEvent('step', {
      step: 'searching',
      message: `Searching web via ${searchProvider.getActiveProviderName()} with ${plan.searchVariants.length} query variants...`,
      variants: plan.searchVariants,
    });

    const candidateMap = new Map<string, SearchResultItem>();
    for (const variant of plan.searchVariants) {
      if (candidateMap.size >= maxResults) break;
      try {
        const results = await searchProvider.search(variant, maxResults);
        for (const item of results) {
          if (!candidateMap.has(item.url)) {
            candidateMap.set(item.url, item);
          }
          if (candidateMap.size >= maxResults) break;
        }
      } catch (err: any) {
        sendEvent('warning', { message: `Search variant warning: ${err.message}` });
      }
      if (candidateMap.size >= maxResults) break;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    const candidateList = Array.from(candidateMap.values());
    sendEvent('step', {
      step: 'fetching',
      message: `Safely fetching ${candidateList.length} candidate pages (SSRF protected)...`,
      count: candidateList.length,
    });

    const sourcesConsulted: ResearchResult['sourcesConsulted'] = [];
    const extractedOpportunities: InternshipOpportunity[] = [];
    const fetchedUrls = new Set<string>();

    for (let i = 0; i < candidateList.length; i++) {
      const candidate = candidateList[i];
      fetchedUrls.add(candidate.url);

      sendEvent('step', {
        step: 'extracting',
        message: `Inspecting [${i + 1}/${candidateList.length}]: ${candidate.domain}`,
      });

      const page = await safePageFetcher.fetchPage(candidate.url);
      sourcesConsulted.push({
        title: candidate.title,
        url: candidate.url,
        domain: candidate.domain,
        fetchedSuccessfully: page.success,
        errorReason: page.error,
      });

      if (page.success && page.html) {
        const content = htmlExtractor.extract(page.html, page.finalUrl);
        let opportunity = await geminiAdapter.extractOpportunity(content, page.finalUrl);

        // Follow vacancy links if page is an index/listing page
        if (
          (!opportunity || content.isIndexPage) &&
          config.followVacancyLinks &&
          content.individualVacancyLinks.length > 0 &&
          extractedOpportunities.length < maxResults
        ) {
          const linksToFollow = content.individualVacancyLinks
            .filter((v) => !fetchedUrls.has(v.url))
            .slice(0, config.maxVacancyLinksPerPage);

          for (const vacancy of linksToFollow) {
            if (extractedOpportunities.length >= maxResults) break;
            fetchedUrls.add(vacancy.url);

            sendEvent('step', {
              step: 'fetching',
              message: `Following vacancy link to detailed position: ${vacancy.title}`,
            });

            const vacancyPage = await safePageFetcher.fetchPage(vacancy.url);
            sourcesConsulted.push({
              title: vacancy.title,
              url: vacancy.url,
              domain: new URL(vacancy.url).hostname,
              fetchedSuccessfully: vacancyPage.success,
              errorReason: vacancyPage.error,
            });

            if (vacancyPage.success && vacancyPage.html) {
              const vacancyContent = htmlExtractor.extract(vacancyPage.html, vacancyPage.finalUrl);
              const vacancyOpp = await geminiAdapter.extractOpportunity(vacancyContent, vacancyPage.finalUrl);
              if (vacancyOpp) {
                const verifiedVacancy = evidenceVerifier.verify(vacancyOpp, vacancyContent);
                extractedOpportunities.push(verifiedVacancy);
                sendEvent('opportunity', verifiedVacancy);
              }
            }
          }
        }

        if (opportunity) {
          const verified = evidenceVerifier.verify(opportunity, content);
          extractedOpportunities.push(verified);
          sendEvent('opportunity', verified);
        }
      }
    }

    sendEvent('step', {
      step: 'ranking',
      message: `Auditing claims and ranking ${extractedOpportunities.length} opportunities...`,
    });

    const rankedOpportunities = opportunityRanker.rank(extractedOpportunities, query);

    let verifiedCount = 0;
    let partialCount = 0;
    let unknownCount = 0;

    for (const opp of rankedOpportunities) {
      const statuses = [
        opp.companyName.status,
        opp.roleTitle.status,
        opp.eligibility.status,
        opp.stipend.status,
        opp.deadline.status,
        opp.officialApplicationLink.status,
      ];
      for (const s of statuses) {
        if (s === 'verified') verifiedCount++;
        else if (s === 'partial') partialCount++;
        else if (s === 'unknown') unknownCount++;
      }
    }

    const executionTimeMs = Date.now() - startTime;
    sendEvent('complete', {
      query,
      generatedQueryVariants: plan.searchVariants,
      opportunities: rankedOpportunities,
      sourcesConsulted,
      totalDiscovered: rankedOpportunities.length,
      verifiedCount,
      partialCount,
      unknownCount,
      executionTimeMs,
    });

    res.end();
  } catch (err: any) {
    sendEvent('error', { message: err.message || 'Pipeline execution failed' });
    res.end();
  }
});

export default router;
