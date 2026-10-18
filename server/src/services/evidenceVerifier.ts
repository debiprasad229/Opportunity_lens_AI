import { FieldEvidence, InternshipOpportunity, VerificationStatus } from '../../../shared/types.js';
import { ExtractedContent } from './htmlExtractor.js';
import { logger } from '../utils/logger.js';

export class EvidenceVerifier {
  /**
   * Grounds and verifies each extracted field of an internship opportunity
   * against the raw page text and candidate evidence.
   */
  public verify(opportunity: InternshipOpportunity, pageContent: ExtractedContent): InternshipOpportunity {
    logger.debug(`Verifying evidence for opportunity: ${opportunity.companyName.value} at ${opportunity.sourceUrl}`);

    const cleanText = pageContent.cleanText.toLowerCase();

    // Verify each field
    opportunity.companyName = this.verifyField(opportunity.companyName, cleanText);
    opportunity.roleTitle = this.verifyField(opportunity.roleTitle, cleanText);
    opportunity.eligibility = this.verifyField(opportunity.eligibility, cleanText);
    opportunity.stipend = this.verifyField(opportunity.stipend, cleanText);
    opportunity.deadline = this.verifyField(opportunity.deadline, cleanText);
    opportunity.officialApplicationLink = this.verifyLinkField(
      opportunity.officialApplicationLink,
      pageContent.candidateApplyLinks,
      opportunity.sourceUrl
    );

    return opportunity;
  }

  private verifyField(field: FieldEvidence, pageTextLower: string): FieldEvidence {
    // 1. If value is missing or null, it's explicitly UNKNOWN
    if (!field.value || field.value.trim() === '') {
      return {
        value: null,
        status: 'unknown',
        confidenceScore: 0.0,
        notes: field.notes || 'Information not disclosed on the source page.',
      };
    }

    const valueLower = field.value.toLowerCase().trim();
    const quoteLower = field.sourceText ? field.sourceText.toLowerCase().trim() : '';

    // 2. If supporting quote is provided, verify it against the source text
    if (quoteLower) {
      const quoteInPage = pageTextLower.includes(quoteLower);
      const valInQuote = quoteLower.includes(valueLower);

      if (quoteInPage && valInQuote) {
        return {
          ...field,
          status: 'verified',
          confidenceScore: 0.98,
          notes: 'Direct verbatim evidence grounded in source text.',
        };
      }

      if (quoteInPage && !valInQuote) {
        // Source quote found, value is a synthesized or paraphrased summary of it
        return {
          ...field,
          status: 'partial',
          confidenceScore: 0.75,
          notes: 'Source quote confirmed on page, but value is synthesized.',
        };
      }

      if (!quoteInPage) {
        // Quote was not found verbatim. Check if the value itself exists in page
        if (pageTextLower.includes(valueLower)) {
          return {
            ...field,
            status: 'partial',
            confidenceScore: 0.65,
            notes: 'Extracted value matches page text, but cited quote was not verbatim.',
          };
        } else {
          return {
            ...field,
            status: 'unverified',
            confidenceScore: 0.3,
            notes: 'Neither value nor source quote could be verified in page text.',
          };
        }
      }
    }

    // 3. No quote provided: test if value appears directly in text
    if (pageTextLower.includes(valueLower)) {
      return {
        ...field,
        status: 'partial',
        confidenceScore: 0.7,
        notes: 'Value appears in page content (no explicit quote cited).',
      };
    }

    return {
      ...field,
      status: 'unverified',
      confidenceScore: 0.25,
      notes: 'Unverified against source text.',
    };
  }

  private verifyLinkField(
    field: FieldEvidence,
    candidateLinks: string[],
    sourceUrl: string
  ): FieldEvidence {
    if (!field.value || field.value.trim() === '') {
      return {
        value: sourceUrl,
        status: 'partial',
        confidenceScore: 0.5,
        sourceUrl,
        notes: 'Direct link not provided; defaulted to source page URL.',
      };
    }

    try {
      const parsed = new URL(field.value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {
          value: sourceUrl,
          status: 'partial',
          confidenceScore: 0.4,
          sourceUrl,
          notes: 'Invalid URL protocol in extracted link.',
        };
      }

      // Check if candidate links match
      const matchesCandidate = candidateLinks.some(link => link.toLowerCase() === field.value!.toLowerCase());

      return {
        ...field,
        status: matchesCandidate || field.value === sourceUrl ? 'verified' : 'partial',
        confidenceScore: matchesCandidate ? 0.95 : 0.8,
        notes: matchesCandidate ? 'Verified application link from page anchors.' : 'Valid application URL.',
      };
    } catch {
      return {
        value: sourceUrl,
        status: 'partial',
        confidenceScore: 0.4,
        sourceUrl,
        notes: 'Malformed application link; defaulted to source URL.',
      };
    }
  }
}

export const evidenceVerifier = new EvidenceVerifier();
