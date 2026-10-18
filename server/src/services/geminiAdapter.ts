import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedContent } from './htmlExtractor.js';
import { FieldEvidence, InternshipOpportunity } from '../../../shared/types.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

interface RawExtractedOpportunity {
  isInternship: boolean;
  companyName: { value: string | null; quote: string | null };
  roleTitle: { value: string | null; quote: string | null };
  eligibility: { value: string | null; quote: string | null };
  stipend: { value: string | null; quote: string | null };
  deadline: { value: string | null; quote: string | null };
  officialApplicationLink: { value: string | null; quote: string | null };
  summary: string;
  isStaleOrClosed: boolean;
}

export class GeminiAdapter {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey && config.geminiApiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
      logger.info('Gemini LLM Adapter initialized with API key');
    } else {
      logger.warn('GEMINI_API_KEY not configured. Running with fallback extractor.');
    }
  }

  public isAvailable(): boolean {
    return !!this.genAI;
  }

  /**
   * Extracts structured internship data from cleaned page content.
   * If Gemini API is available, calls Gemini Flash.
   * Otherwise, falls back to deterministic heuristic regex extraction.
   */
  public async extractOpportunity(
    content: ExtractedContent,
    sourceUrl: string
  ): Promise<InternshipOpportunity | null> {
    if (this.genAI) {
      try {
        return await this.extractWithGemini(content, sourceUrl);
      } catch (err: any) {
        logger.error(`Gemini extraction failed: ${err.message}. Falling back to heuristic extractor.`);
      }
    }

    return this.extractWithHeuristics(content, sourceUrl);
  }

  /**
   * LLM Extraction with Google Gemini 3.8 Flash
   */
  private async extractWithGemini(
    content: ExtractedContent,
    sourceUrl: string
  ): Promise<InternshipOpportunity | null> {
    if (!this.genAI) return null;

    const model = this.genAI.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const prompt = `
You are an expert fact-extraction agent for OpportunityLens AI, adhering to the AMD AI League Match 4 Intelligent Web Information Retrieval guidelines.

Your task is to analyze the following webpage content and extract software development internship details for fresh graduates/students.

CRITICAL RULES:
1. Ground every extracted fact in verbatim source text.
2. If any fact (e.g. stipend, deadline, eligibility) is NOT explicitly mentioned or cannot be verified in the text, you MUST return null for that value and quote. DO NOT hallucinate, guess, or extrapolate.
3. If this page is NOT an internship or job posting (e.g. generic blog article, company homepage, scam portal), set "isInternship": false.
4. Extract the exact official application link if mentioned or if candidate links match.

Target URL: ${sourceUrl}
Page Title: ${content.title}
Candidate Application Links: ${JSON.stringify(content.candidateApplyLinks)}
Structured Data (JSON-LD): ${JSON.stringify(content.jsonLdJobs)}
Tables: ${JSON.stringify(content.tablesText)}

PAGE TEXT:
"""
${content.cleanText}
"""

Return a JSON object conforming STRICTLY to this JSON structure:
{
  "isInternship": boolean,
  "companyName": { "value": string or null, "quote": string or null },
  "roleTitle": { "value": string or null, "quote": string or null },
  "eligibility": { "value": string or null, "quote": string or null },
  "stipend": { "value": string or null, "quote": string or null },
  "deadline": { "value": string or null, "quote": string or null },
  "officialApplicationLink": { "value": string or null, "quote": string or null },
  "summary": string,
  "isStaleOrClosed": boolean
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed: RawExtractedOpportunity;
    try {
      parsed = JSON.parse(responseText);
    } catch (err: any) {
      logger.error(`Failed to parse Gemini response as JSON: ${responseText}`);
      return null;
    }

    if (!parsed || !parsed.isInternship) {
      logger.info(`Page ${sourceUrl} was classified as non-internship by Gemini.`);
      return null;
    }

    const domain = new URL(sourceUrl).hostname;
    const now = new Date().toISOString();

    const makeField = (field: { value: string | null; quote: string | null }): FieldEvidence => {
      const hasValue = field && field.value && field.value.trim() !== '';
      return {
        value: hasValue ? field.value!.trim() : null,
        status: hasValue ? 'unverified' : 'unknown', // Will be verified by EvidenceVerifier
        sourceText: field?.quote || undefined,
        sourceUrl,
        notes: hasValue ? undefined : 'Not mentioned on page',
      };
    };

    // Application link resolution
    let appLink = parsed.officialApplicationLink?.value;
    if (!appLink && content.candidateApplyLinks.length > 0) {
      appLink = content.candidateApplyLinks[0];
    }
    if (!appLink) {
      appLink = sourceUrl;
    }

    return {
      id: Buffer.from(sourceUrl).toString('base64url').slice(0, 16),
      companyName: makeField(parsed.companyName),
      roleTitle: makeField(parsed.roleTitle),
      eligibility: makeField(parsed.eligibility),
      stipend: makeField(parsed.stipend),
      deadline: makeField(parsed.deadline),
      officialApplicationLink: {
        value: appLink,
        status: appLink ? 'verified' : 'unknown',
        sourceText: parsed.officialApplicationLink?.quote || undefined,
        sourceUrl,
      },
      sourceDomain: domain,
      sourceUrl,
      overallScore: 50, // Updated by Ranker
      discoveredAt: now,
      summary: parsed.summary || `${parsed.roleTitle?.value || 'Internship'} at ${parsed.companyName?.value || domain}`,
      isStaleOrClosed: parsed.isStaleOrClosed || false,
    };
  }

  /**
   * Deterministic heuristic extractor used when GEMINI_API_KEY is not configured
   * or during unit tests. Ensures the application can still be evaluated and tested.
   */
  public extractWithHeuristics(
    content: ExtractedContent,
    sourceUrl: string
  ): InternshipOpportunity | null {
    const text = content.cleanText;
    const lower = text.toLowerCase();

    // Check if it's an internship, co-op, or placement
    const titleLower = content.title.toLowerCase();
    const isInternship =
      lower.includes('intern') ||
      lower.includes('internship') ||
      lower.includes('trainee') ||
      lower.includes('apprentice') ||
      lower.includes('placement') ||
      lower.includes('co-op') ||
      titleLower.includes('intern') ||
      titleLower.includes('placement') ||
      titleLower.includes('co-op');

    if (!isInternship) {
      return null;
    }

    const domain = new URL(sourceUrl).hostname;
    const now = new Date().toISOString();

    // Heuristic 1: Company Name from Title or Domain
    let companyNameVal: string | null = null;
    let companyQuote: string | null = null;
    if (content.title.includes(' - ')) {
      const parts = content.title.split(' - ');
      companyNameVal = parts[parts.length - 1].trim();
      companyQuote = content.title;
    } else if (content.title.includes(' | ')) {
      const parts = content.title.split(' | ');
      companyNameVal = parts[parts.length - 1].trim();
      companyQuote = content.title;
    } else {
      companyNameVal = domain.replace(/^www\./, '').split('.')[0];
      companyNameVal = companyNameVal.charAt(0).toUpperCase() + companyNameVal.slice(1);
    }

    // Heuristic 2: Role Title
    let roleVal: string | null = null;
    let roleQuote: string | null = null;
    const roleMatch = text.match(/(Software (?:Engineer|Developer|Placement)|Frontend|Backend|Full Stack|SDE|Data Science|AI|ML)\s*(?:Intern|Internship|Placement)/i);
    if (roleMatch) {
      roleVal = roleMatch[0];
      roleQuote = roleMatch[0];
    } else if (content.headings.length > 0) {
      const headingWithIntern = content.headings.find(h => /intern|placement/i.test(h));
      if (headingWithIntern) {
        roleVal = headingWithIntern;
        roleQuote = headingWithIntern;
      }
    }
    if (!roleVal && content.title) {
      roleVal = content.title.split(' - ')[0].split(' | ')[0].trim();
      roleQuote = content.title;
    }
    if (!roleVal) {
      roleVal = 'Software Engineering Intern';
    }

    // Heuristic 3: Stipend
    let stipendVal: string | null = null;
    let stipendQuote: string | null = null;
    const stipendMatch = text.match(/(?:stipend|salary|pay|compensation)[\s:]*([$₹€£][\d,]+(?:\s*-\s*[$₹€£]?[\d,]+)?(?:\s*(?:per|\/)\s*(?:month|hr|year|week|mo))?)/i);
    if (stipendMatch) {
      stipendVal = stipendMatch[1];
      stipendQuote = stipendMatch[0];
    }

    // Heuristic 4: Eligibility
    let eligibilityVal: string | null = null;
    let eligibilityQuote: string | null = null;
    const eligMatch = text.match(/(?:eligibility|qualification|requirements|who can apply)[\s:]*([^\.\n]{15,180})/i);
    if (eligMatch) {
      eligibilityVal = eligMatch[1].trim();
      eligibilityQuote = eligMatch[0];
    } else {
      const batchMatch = text.match(/\b(202[4-7]\s*(?:batch|graduates|passout))/i);
      if (batchMatch) {
        eligibilityVal = batchMatch[1];
        eligibilityQuote = batchMatch[0];
      }
    }

    // Heuristic 5: Deadline
    let deadlineVal: string | null = null;
    let deadlineQuote: string | null = null;
    const deadlineMatch = text.match(/(?:deadline|last date|apply before|closing date)[\s:]*([A-Za-z0-9,\s]{6,30})/i);
    if (deadlineMatch) {
      deadlineVal = deadlineMatch[1].trim();
      deadlineQuote = deadlineMatch[0];
    }

    // Application Link
    const appLink = content.candidateApplyLinks[0] || sourceUrl;

    const makeField = (val: string | null, quote: string | null): FieldEvidence => ({
      value: val,
      status: val ? 'unverified' : 'unknown',
      sourceText: quote || undefined,
      sourceUrl,
      notes: val ? (this.isAvailable() ? undefined : 'Extracted via fallback heuristic') : 'Not mentioned on page',
    });

    return {
      id: Buffer.from(sourceUrl).toString('base64url').slice(0, 16),
      companyName: makeField(companyNameVal, companyQuote),
      roleTitle: makeField(roleVal, roleQuote),
      eligibility: makeField(eligibilityVal, eligibilityQuote),
      stipend: makeField(stipendVal, stipendQuote),
      deadline: makeField(deadlineVal, deadlineQuote),
      officialApplicationLink: {
        value: appLink,
        status: 'verified',
        sourceUrl,
      },
      sourceDomain: domain,
      sourceUrl,
      overallScore: 40,
      discoveredAt: now,
      summary: `${roleVal} at ${companyNameVal}`,
      isStaleOrClosed: false,
    };
  }
}

export const geminiAdapter = new GeminiAdapter();
