import { InternshipOpportunity, VerificationStatus } from '../../../shared/types.js';
import { logger } from '../utils/logger.js';

export class OpportunityRanker {
  /**
   * Scores and sorts internship opportunities based on fact completeness,
   * verification confidence, query relevance, and freshness.
   */
  public rank(opportunities: InternshipOpportunity[], userQuery: string): InternshipOpportunity[] {
    logger.info(`Ranking ${opportunities.length} opportunities for query: "${userQuery}"`);

    const queryKeywords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scored = opportunities.map(opp => {
      let score = 0;

      // 1. Field Completeness and Verification Confidence (Up to 60 points)
      score += this.scoreField(opp.companyName.status, 15);
      score += this.scoreField(opp.roleTitle.status, 15);
      score += this.scoreField(opp.eligibility.status, 10);
      score += this.scoreField(opp.stipend.status, 10);
      score += this.scoreField(opp.deadline.status, 5);
      score += this.scoreField(opp.officialApplicationLink.status, 5);

      // 2. Query Keyword Relevance (Up to 25 points)
      const combinedText = `
        ${opp.companyName.value || ''}
        ${opp.roleTitle.value || ''}
        ${opp.eligibility.value || ''}
        ${opp.summary || ''}
      `.toLowerCase();

      let matchedKeywordsCount = 0;
      for (const kw of queryKeywords) {
        if (combinedText.includes(kw)) {
          matchedKeywordsCount++;
        }
      }
      const keywordRatio = queryKeywords.length > 0 ? matchedKeywordsCount / queryKeywords.length : 0.5;
      score += Math.round(keywordRatio * 25);

      // 3. Fresh Graduate Relevance Bonus (Up to 15 points)
      const freshSignals = /(fresh\s*grad|fresher|university|college|student|entry\s*level|intern|2025|2026|batch)/i;
      if (freshSignals.test(combinedText)) {
        score += 15;
      }

      // 4. Stale or Closed Penalty (-30 points)
      if (opp.isStaleOrClosed) {
        score = Math.max(0, score - 30);
      }

      // Clamp between 0 and 100
      opp.overallScore = Math.min(100, Math.max(0, score));
      return opp;
    });

    // Sort descending by overallScore
    return scored.sort((a, b) => b.overallScore - a.overallScore);
  }

  private scoreField(status: VerificationStatus, maxPoints: number): number {
    switch (status) {
      case 'verified':
        return maxPoints;
      case 'partial':
        return Math.round(maxPoints * 0.7);
      case 'unverified':
        return Math.round(maxPoints * 0.3);
      case 'unknown':
      default:
        return 0;
    }
  }
}

export const opportunityRanker = new OpportunityRanker();
